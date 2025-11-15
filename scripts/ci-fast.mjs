#!/usr/bin/env node
/**
 * CI Fast Verification Script (Tier 1)
 * Fast commit path: typecheck + lint only
 * Runtime: ~25-75 seconds
 * Blocks: Pre-commit hook
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    log(`\n${colors.blue}▶${colors.reset} Running: ${colors.bright}${command} ${args.join(' ')}${colors.reset}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`${colors.green}✓${colors.reset} ${command} ${args.join(' ')} ${colors.green}passed${colors.reset}`);
        resolve();
      } else {
        log(`${colors.red}✗${colors.reset} ${command} ${args.join(' ')} ${colors.red}failed${colors.reset} (exit code: ${code})`);
        reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
      }
    });

    child.on('error', (err) => {
      log(`${colors.red}✗${colors.reset} Failed to start command: ${err.message}`, colors.red);
      reject(err);
    });
  });
}

async function main() {
  log('\n' + '='.repeat(60), colors.bright);
  log('  CI FAST VERIFICATION (Tier 1: Pre-Commit)', colors.bright);
  log('='.repeat(60) + '\n', colors.bright);

  const steps = [
    { name: 'TypeCheck', command: 'npm', args: ['run', 'typecheck'] },
    { name: 'Lint', command: 'npm', args: ['run', 'lint'] },
  ];

  let passedSteps = 0;
  const startTime = Date.now();

  for (const step of steps) {
    try {
      await runCommand(step.command, step.args);
      passedSteps++;
    } catch (err) {
      log(`\n${colors.red}${'='.repeat(60)}${colors.reset}`, colors.red);
      log(`  ❌ CI FAST VERIFICATION FAILED AT: ${step.name}`, colors.red);
      log(`${colors.red}${'='.repeat(60)}${colors.reset}\n`, colors.red);
      process.exit(1);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  log(`\n${colors.green}${'='.repeat(60)}${colors.reset}`, colors.green);
  log(`  ✅ ALL CI FAST VERIFICATION STEPS PASSED (${passedSteps}/${steps.length})`, colors.green);
  log(`  Duration: ${duration}s`, colors.green);
  log(`${colors.green}${'='.repeat(60)}${colors.reset}\n`, colors.green);
}

main().catch((err) => {
  log(`\n${colors.red}Fatal error:${colors.reset} ${err.message}`, colors.red);
  process.exit(1);
});









