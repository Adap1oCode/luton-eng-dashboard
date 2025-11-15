#!/usr/bin/env node
/**
 * Port Management Utility
 * 
 * This script helps manage port usage and prevents conflicts
 * by checking port availability and providing clear information
 */

// Port configuration (inline to avoid TypeScript compilation issues)
const PORTS = {
  PRODUCTION: 3000,
  DEVELOPMENT: 3001,
  TEST: 3002,
  E2E: 3003,
  CI_HEALTH_CHECK: 3004,
  CI_VERIFICATION: 3005,
  HEALTH_CHECK_DEV: 3006,
  HEALTH_CHECK_PROD: 3007,
  RESERVED_1: 3008,
  RESERVED_2: 3009,
};

const PORT_USAGE = {
  [PORTS.PRODUCTION]: 'Production server (npm run start)',
  [PORTS.DEVELOPMENT]: 'Development server (npm run dev)',
  [PORTS.TEST]: 'Unit/integration tests',
  [PORTS.E2E]: 'End-to-end tests (Playwright)',
  [PORTS.CI_HEALTH_CHECK]: 'CI health check server',
  [PORTS.CI_VERIFICATION]: 'CI verification server',
  [PORTS.HEALTH_CHECK_DEV]: 'Development health checks',
  [PORTS.HEALTH_CHECK_PROD]: 'Production health checks',
};

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

async function findAvailablePort(startPort, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort} after ${maxAttempts} attempts`);
}

import { spawn } from 'child_process';
import { platform } from 'os';
import { createServer } from 'net';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message) {
  console.log(message);
}

function getProcessUsingPort(port) {
  return new Promise((resolve) => {
    const isWindows = platform() === 'win32';
    const command = isWindows ? 'netstat' : 'lsof';
    const args = isWindows ? ['-ano', `:${port}`] : ['-i', `:${port}`];
    
    const child = spawn(command, args, { stdio: 'pipe' });
    let output = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0 && output.trim()) {
        const lines = output.trim().split('\n');
        const processLine = lines.find(line => line.includes(`:${port}`));
        if (processLine) {
          if (isWindows) {
            const parts = processLine.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            resolve({ pid, line: processLine });
          } else {
            resolve({ line: processLine });
          }
        } else {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
    
    child.on('error', () => {
      resolve(null);
    });
  });
}

async function checkPortStatus(port) {
  const available = await isPortAvailable(port);
  const process = available ? null : await getProcessUsingPort(port);
  
  return {
    port,
    available,
    process,
    usage: PORT_USAGE[port] || 'Unknown'
  };
}

async function showPortStatus() {
  log(`${colors.blue}Port Status Report${colors.reset}\n`);
  
  const portChecks = await Promise.all(
    Object.values(PORTS).map(port => checkPortStatus(port))
  );
  
  for (const status of portChecks) {
    const statusIcon = status.available ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const statusText = status.available ? 'Available' : 'In Use';
    
    log(`${statusIcon} Port ${status.port}: ${statusText} - ${status.usage}`);
    
    if (!status.available && status.process) {
      if (status.process.pid) {
        log(`   Process: PID ${status.process.pid}`);
      }
      log(`   Details: ${status.process.line}`);
    }
    log('');
  }
}

async function killProcessOnPort(port) {
  const status = await checkPortStatus(port);
  
  if (status.available) {
    log(`${colors.yellow}Port ${port} is already available${colors.reset}`);
    return;
  }
  
  if (!status.process || !status.process.pid) {
    log(`${colors.red}Could not find process using port ${port}${colors.reset}`);
    return;
  }
  
  const isWindows = platform() === 'win32';
  const command = isWindows ? 'taskkill' : 'kill';
  const args = isWindows ? ['/PID', status.process.pid, '/F'] : ['-9', status.process.pid];
  
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'pipe' });
    
    child.on('close', (code) => {
      if (code === 0) {
        log(`${colors.green}Successfully killed process ${status.process.pid} on port ${port}${colors.reset}`);
      } else {
        log(`${colors.red}Failed to kill process on port ${port}${colors.reset}`);
      }
      resolve();
    });
    
    child.on('error', () => {
      log(`${colors.red}Error killing process on port ${port}${colors.reset}`);
      resolve();
    });
  });
}

async function findAvailablePorts() {
  log(`${colors.blue}Finding Available Ports${colors.reset}\n`);
  
  for (const [name, port] of Object.entries(PORTS)) {
    const available = await isPortAvailable(port);
    if (available) {
      log(`${colors.green}✓${colors.reset} Port ${port} (${name}) is available`);
    } else {
      const nextAvailable = await findAvailablePort(port);
      log(`${colors.yellow}⚠${colors.reset} Port ${port} (${name}) is in use. Next available: ${nextAvailable}`);
    }
  }
}

function showHelp() {
  log(`${colors.cyan}Port Manager Utility${colors.reset}\n`);
  log('Usage: node scripts/port-manager.mjs [command]\n');
  log('Commands:');
  log('  status     - Show status of all defined ports');
  log('  available  - Find available ports');
  log('  kill <port> - Kill process using specified port');
  log('  help       - Show this help message\n');
  log('Examples:');
  log('  node scripts/port-manager.mjs status');
  log('  node scripts/port-manager.mjs kill 3000');
  log('  node scripts/port-manager.mjs available');
}

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'status':
      await showPortStatus();
      break;
    case 'available':
      await findAvailablePorts();
      break;
    case 'kill': {
      const port = parseInt(process.argv[3]);
      if (isNaN(port)) {
        log(`${colors.red}Please provide a valid port number${colors.reset}`);
        process.exit(1);
      }
      await killProcessOnPort(port);
      break;
    }
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      log(`${colors.red}Unknown command: ${command}${colors.reset}\n`);
      showHelp();
      process.exit(1);
  }
}

main().catch(console.error);
