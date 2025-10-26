#!/usr/bin/env node

/**
 * Automated Vercel Deployment Monitor
 * Monitors Vercel deployments and reports build failures
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class VercelMonitor {
  constructor() {
    this.projectName = 'luton-eng-dashboard';
    this.maxAttempts = 10;
    this.checkInterval = 30000; // 30 seconds
    this.attempts = 0;
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getLatestDeployment() {
    try {
      this.log('🔍 Checking for latest deployment...');
      const output = execSync('npx vercel ls --yes', { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      const lines = output.split('\n');
      const deploymentLine = lines.find(line => 
        line.includes('● Error') || 
        line.includes('● Ready') || 
        line.includes('● Building')
      );
      
      if (deploymentLine) {
        const urlMatch = deploymentLine.match(/https:\/\/[^\s]+/);
        if (urlMatch) {
          return urlMatch[0];
        }
      }
      
      return null;
    } catch (error) {
      this.log(`❌ Error getting deployments: ${error.message}`);
      return null;
    }
  }

  async getDeploymentStatus(deploymentUrl) {
    try {
      this.log(`🔍 Checking status of ${deploymentUrl}...`);
      const output = execSync(`npx vercel inspect "${deploymentUrl}"`, { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      const statusMatch = output.match(/status\s+(●\s+\w+)/);
      if (statusMatch) {
        return statusMatch[1].trim();
      }
      
      return 'Unknown';
    } catch (error) {
      this.log(`❌ Error checking deployment status: ${error.message}`);
      return 'Error';
    }
  }

  async getBuildLogs(deploymentUrl) {
    try {
      this.log(`📋 Attempting to get build logs for ${deploymentUrl}...`);
      
      // Try to get logs (this might fail for failed deployments)
      try {
        const logs = execSync(`npx vercel logs "${deploymentUrl}"`, { 
          encoding: 'utf8',
          cwd: process.cwd(),
          timeout: 10000
        });
        return logs;
      } catch (logError) {
        this.log(`⚠️  Could not get runtime logs: ${logError.message}`);
        return 'No runtime logs available (deployment failed)';
      }
    } catch (error) {
      this.log(`❌ Error getting logs: ${error.message}`);
      return 'Error getting logs';
    }
  }

  async saveLogsToFile(logs, deploymentUrl) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `vercel-logs-${timestamp}.txt`;
    const filepath = path.join(process.cwd(), filename);
    
    const logContent = `
Vercel Deployment Logs
======================
Deployment URL: ${deploymentUrl}
Timestamp: ${new Date().toISOString()}
Status: ${await this.getDeploymentStatus(deploymentUrl)}

Logs:
${logs}
`;
    
    fs.writeFileSync(filepath, logContent);
    this.log(`💾 Logs saved to: ${filename}`);
    return filename;
  }

  async monitorDeployment() {
    this.log('🚀 Starting Vercel deployment monitoring...');
    
    while (this.attempts < this.maxAttempts) {
      this.attempts++;
      this.log(`\n📊 Attempt ${this.attempts}/${this.maxAttempts}`);
      
      const deploymentUrl = await this.getLatestDeployment();
      
      if (!deploymentUrl) {
        this.log('❌ No deployment found. Waiting for deployment to start...');
        await this.sleep(this.checkInterval);
        continue;
      }
      
      this.log(`🎯 Monitoring deployment: ${deploymentUrl}`);
      
      const status = await this.getDeploymentStatus(deploymentUrl);
      this.log(`📈 Status: ${status}`);
      
      if (status.includes('Ready')) {
        this.log('✅ Deployment successful!');
        return { success: true, url: deploymentUrl };
      }
      
      if (status.includes('Error')) {
        this.log('❌ Deployment failed! Getting logs...');
        
        const logs = await this.getBuildLogs(deploymentUrl);
        const logFile = await this.saveLogsToFile(logs, deploymentUrl);
        
        this.log('🔍 Analyzing failure...');
        this.analyzeFailure(logs);
        
        return { 
          success: false, 
          url: deploymentUrl, 
          logs: logs,
          logFile: logFile,
          status: status
        };
      }
      
      if (status.includes('Building')) {
        this.log('⏳ Deployment still building...');
      }
      
      this.log(`⏱️  Waiting ${this.checkInterval/1000}s before next check...`);
      await this.sleep(this.checkInterval);
    }
    
    this.log('⏰ Monitoring timeout reached');
    return { success: false, error: 'Timeout' };
  }

  analyzeFailure(logs) {
    this.log('\n🔍 Failure Analysis:');
    this.log('==================');
    
    const commonErrors = [
      { pattern: /useSearchParams.*suspense/i, fix: 'Wrap useSearchParams in Suspense boundary' },
      { pattern: /syntax error/i, fix: 'Check for syntax errors in TypeScript/JavaScript files' },
      { pattern: /module not found/i, fix: 'Check import paths and dependencies' },
      { pattern: /typescript error/i, fix: 'Fix TypeScript compilation errors' },
      { pattern: /eslint error/i, fix: 'Fix ESLint errors' },
      { pattern: /build failed/i, fix: 'Check build configuration' },
      { pattern: /missing dependency/i, fix: 'Install missing dependencies' },
      { pattern: /permission denied/i, fix: 'Check file permissions' }
    ];
    
    let foundIssues = [];
    
    commonErrors.forEach(({ pattern, fix }) => {
      if (pattern.test(logs)) {
        foundIssues.push(fix);
        this.log(`⚠️  ${fix}`);
      }
    });
    
    if (foundIssues.length === 0) {
      this.log('❓ No common error patterns detected. Check logs manually.');
    }
    
    this.log(`\n📋 Found ${foundIssues.length} potential issues`);
  }
}

// Main execution
async function main() {
  const monitor = new VercelMonitor();
  
  try {
    const result = await monitor.monitorDeployment();
    
    if (result.success) {
      console.log('\n🎉 SUCCESS: Deployment completed successfully!');
      console.log(`🌐 URL: ${result.url}`);
      process.exit(0);
    } else {
      console.log('\n❌ FAILURE: Deployment failed');
      if (result.logFile) {
        console.log(`📄 Check logs in: ${result.logFile}`);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Monitor error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = VercelMonitor;
