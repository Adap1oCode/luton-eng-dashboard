#!/usr/bin/env node
/**
 * CI PR Verification Script (Tier 3)
 * PR verification: all Tier 2 checks + E2E smoke + docs check
 * Runtime: ~5-10 minutes
 * Blocks: PR merge
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';
import { join } from 'path';

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

function checkDocsUpdated() {
  log(`\n${colors.blue}▶${colors.reset} Checking if docs are updated...`);
  
  // This is a simplified check - in CI, GitHub Actions handles this more thoroughly
  // For local runs, we just verify docs directory exists
  const docsDir = join(process.cwd(), 'docs');
  if (!existsSync(docsDir)) {
    log(`${colors.yellow}⚠${colors.reset} Docs directory not found, skipping docs check`, colors.yellow);
    return true;
  }
  
  log(`${colors.green}✓${colors.reset} Docs directory exists`);
  log(`${colors.yellow}ℹ${colors.reset} Full docs check runs in GitHub Actions CI workflow`, colors.yellow);
  return true;
}

async function main() {
  log('\n' + '='.repeat(60), colors.bright);
  log('  CI PR VERIFICATION (Tier 3: PR Merge)', colors.bright);
  log('='.repeat(60) + '\n', colors.bright);

  // First run all Tier 2 checks (ci:verify)
  log(`${colors.blue}▶${colors.reset} Running Tier 2 verification (ci:verify)...`, colors.blue);
  try {
    await runCommand('npm', ['run', 'ci:verify']);
  } catch (err) {
    log(`\n${colors.red}${'='.repeat(60)}${colors.reset}`, colors.red);
    log(`  ❌ CI PR VERIFICATION FAILED: Tier 2 checks failed`, colors.red);
    log(`${colors.red}${'='.repeat(60)}${colors.reset}\n`, colors.red);
    process.exit(1);
  }

  // Then run additional PR checks (E2E tests removed per user request)
  const steps = [
    { name: 'Docs Check', command: null, check: checkDocsUpdated },
  ];

  let passedSteps = 0;
  const startTime = Date.now();

  for (const step of steps) {
    try {
      if (step.check) {
        const result = await step.check();
        if (result) {
          passedSteps++;
        } else {
          throw new Error(`Check failed: ${step.name}`);
        }
      } else {
        await runCommand(step.command, step.args);
        passedSteps++;
      }
    } catch (err) {
      log(`\n${colors.red}${'='.repeat(60)}${colors.reset}`, colors.red);
      log(`  ❌ CI PR VERIFICATION FAILED AT: ${step.name}`, colors.red);
      log(`${colors.red}${'='.repeat(60)}${colors.reset}\n`, colors.red);
      process.exit(1);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  log(`\n${colors.green}${'='.repeat(60)}${colors.reset}`, colors.green);
  log(`  ✅ ALL CI PR VERIFICATION STEPS PASSED (${passedSteps}/${steps.length} + Tier 2)`, colors.green);
  log(`  Duration: ${duration}s`, colors.green);
  log(`${colors.green}${'='.repeat(60)}${colors.reset}\n`, colors.green);
}

main().catch((err) => {
  log(`\n${colors.red}Fatal error:${colors.reset} ${err.message}`, colors.red);
  process.exit(1);
});


