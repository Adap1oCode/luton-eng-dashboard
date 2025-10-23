#!/usr/bin/env node

/**
 * Setup script for logging configuration
 * This script helps configure logging environment variables
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ENV_FILE = '.env.local';

function createEnvFile() {
  const envContent = `# Logging Configuration
# Set LOG_ENABLE_LOKI=true to enable Loki logging
LOG_ENABLE_LOKI=false
# Replace with your actual Loki URL (remove the <placeholders>)
# LOKI_URL=https://your-tenant.logs.your-region.grafana.net/loki/api/v1/push
# LOKI_USER=your-loki-user
# LOKI_PASS=your-loki-password

# Alternative: Logtail logging
LOG_ENABLE_LOGTAIL=false
# LOGTAIL_URL=https://in.logtail.com
# LOGTAIL_TOKEN=your-logtail-token

# Log level (debug, info, warn, error)
LOG_LEVEL=info
`;

  if (existsSync(ENV_FILE)) {
    console.log(`⚠️  ${ENV_FILE} already exists. Please manually add the logging configuration.`);
    console.log('\nAdd these variables to your .env.local file:');
    console.log(envContent);
  } else {
    writeFileSync(ENV_FILE, envContent);
    console.log(`✅ Created ${ENV_FILE} with logging configuration`);
    console.log('📝 Please update the values with your actual logging service credentials');
  }
}

function checkCurrentConfig() {
  console.log('🔍 Current logging configuration:');
  console.log(`LOG_ENABLE_LOKI: ${process.env.LOG_ENABLE_LOKI || 'not set'}`);
  console.log(`LOG_ENABLE_LOGTAIL: ${process.env.LOG_ENABLE_LOGTAIL || 'not set'}`);
  console.log(`LOG_LEVEL: ${process.env.LOG_LEVEL || 'not set'}`);
  
  if (process.env.LOKI_URL) {
    const hasPlaceholders = process.env.LOKI_URL.includes('<') || process.env.LOKI_URL.includes('>');
    console.log(`LOKI_URL: ${hasPlaceholders ? '❌ Contains placeholders' : '✅ Valid URL'}`);
  } else {
    console.log('LOKI_URL: not set');
  }
}

// Main execution
console.log('🚀 Logging Configuration Setup\n');

if (process.argv.includes('--check')) {
  checkCurrentConfig();
} else {
  createEnvFile();
  console.log('\n💡 Tips:');
  console.log('• Set LOG_ENABLE_LOKI=false to disable Loki logging completely');
  console.log('• Remove or comment out LOKI_URL if you don\'t need Loki logging');
  console.log('• Run with --check flag to verify current configuration');
}
