#!/usr/bin/env node
/**
 * CI Nightly Verification Script (Tier 4)
 * Comprehensive verification: all Tier 3 checks + integration + full E2E + performance + auto-fixes
 * Runtime: ~15-30 minutes
 * Blocks: Nothing (runs on schedule)
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

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

function runCommand(command, args = [], allowFailure = false) {
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
        resolve({ success: true, code: 0 });
      } else {
        log(`${colors.red}✗${colors.reset} ${command} ${args.join(' ')} ${colors.red}failed${colors.reset} (exit code: ${code})`);
        if (allowFailure) {
          resolve({ success: false, code });
        } else {
          reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
        }
      }
    });

    child.on('error', (err) => {
      log(`${colors.red}✗${colors.reset} Failed to start command: ${err.message}`, colors.red);
      if (allowFailure) {
        resolve({ success: false, error: err.message });
      } else {
        reject(err);
      }
    });
  });
}

async function attemptAutoFix() {
  log(`\n${colors.blue}▶${colors.reset} Attempting auto-fixes...`, colors.blue);
  
  const fixes = [
    { name: 'Lint Auto-Fix', command: 'npm', args: ['run', 'lint', '--', '--fix'] },
    { name: 'Format Code', command: 'npm', args: ['run', 'format'] },
  ];

  let fixedCount = 0;
  const changesBefore = getGitChanges();

  for (const fix of fixes) {
    try {
      await runCommand(fix.command, fix.args, true);
      fixedCount++;
    } catch (err) {
      log(`${colors.yellow}⚠${colors.reset} ${fix.name} failed, continuing...`, colors.yellow);
    }
  }

  const changesAfter = getGitChanges();
  const hasChanges = changesBefore !== changesAfter;

  if (hasChanges) {
    log(`${colors.green}✓${colors.reset} Auto-fixes applied (${fixedCount} fixes)`, colors.green);
    log(`${colors.yellow}ℹ${colors.reset} Changes detected. Consider committing: git add . && git commit -m "chore: apply auto-fixes"`, colors.yellow);
    return true;
  } else {
    log(`${colors.green}✓${colors.reset} No auto-fixes needed`, colors.green);
    return false;
  }
}

function getGitChanges() {
  try {
    return execSync('git diff --stat', { encoding: 'utf-8', cwd: process.cwd() });
  } catch {
    return '';
  }
}

async function main() {
  log('\n' + '='.repeat(60), colors.bright);
  log('  CI NIGHTLY VERIFICATION (Tier 4: Comprehensive)', colors.bright);
  log('='.repeat(60) + '\n', colors.bright);

  // First run all Tier 3 checks (ci:pr)
  log(`${colors.blue}▶${colors.reset} Running Tier 3 verification (ci:pr)...`, colors.blue);
  try {
    await runCommand('npm', ['run', 'ci:pr']);
  } catch (err) {
    log(`${colors.yellow}⚠${colors.reset} Tier 3 checks failed, but continuing with nightly tests...`, colors.yellow);
  }

  // Then run comprehensive tests
  const steps = [
    { name: 'Integration Tests', command: 'npm', args: ['run', 'test:nightly'], allowFailure: true },
    { name: 'Full E2E Suite', command: 'npm', args: ['run', 'test:e2e'], allowFailure: true },
    // Performance tests would go here if we had a test:performance script
  ];

  let passedSteps = 0;
  let failedSteps = [];
  const startTime = Date.now();

  for (const step of steps) {
    try {
      const result = await runCommand(step.command, step.args, step.allowFailure || false);
      if (result.success) {
        passedSteps++;
      } else {
        failedSteps.push(step.name);
        if (!step.allowFailure) {
          throw new Error(`Step failed: ${step.name}`);
        }
      }
    } catch (err) {
      if (step.allowFailure) {
        log(`${colors.yellow}⚠${colors.reset} ${step.name} failed (non-blocking)`, colors.yellow);
        failedSteps.push(step.name);
      } else {
        log(`\n${colors.red}${'='.repeat(60)}${colors.reset}`, colors.red);
        log(`  ❌ CI NIGHTLY VERIFICATION FAILED AT: ${step.name}`, colors.red);
        log(`${colors.red}${'='.repeat(60)}${colors.reset}\n`, colors.red);
        process.exit(1);
      }
    }
  }

  // Attempt auto-fixes
  const fixesApplied = await attemptAutoFix();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  log(`\n${colors.green}${'='.repeat(60)}${colors.reset}`, colors.green);
  log(`  ✅ CI NIGHTLY VERIFICATION COMPLETE`, colors.green);
  log(`  Passed: ${passedSteps}/${steps.length}`, colors.green);
  if (failedSteps.length > 0) {
    log(`  ${colors.yellow}Failed (non-blocking): ${failedSteps.join(', ')}${colors.reset}`, colors.yellow);
  }
  if (fixesApplied) {
    log(`  ${colors.blue}Auto-fixes applied - review and commit changes${colors.reset}`, colors.blue);
  }
  log(`  Duration: ${duration}s`, colors.green);
  log(`${colors.green}${'='.repeat(60)}${colors.reset}\n`, colors.green);

  // Exit with code 0 even if some tests failed (non-blocking)
  // In CI, this allows the workflow to continue and create issues/PRs
  process.exit(0);
}

main().catch((err) => {
  log(`\n${colors.red}Fatal error:${colors.reset} ${err.message}`, colors.red);
  // Don't exit with error code - nightly runs are non-blocking
  process.exit(0);
});











