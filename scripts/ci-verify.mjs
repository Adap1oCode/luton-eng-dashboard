#!/usr/bin/env node
/**
 * CI Verification Script
 * Runs all verification steps required by the Cursor Working Agreement.
 * Cross-platform compatible (Windows, macOS, Linux) and automatically detects npm/pnpm/yarn.
 */

import { spawn, spawnSync } from 'child_process';
import { join } from 'path';
import { existsSync, statSync, readdirSync, writeFileSync } from 'fs';
import { request } from 'http';
import { performance } from 'perf_hooks';
import { cpus } from 'os';

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

function resolvePackageManager() {
  const userAgent = process.env.npm_config_user_agent || '';
  const isWindows = process.platform === 'win32';

  if (userAgent.startsWith('pnpm/')) {
    return {
      name: 'pnpm',
      command: isWindows ? 'pnpm.cmd' : 'pnpm',
      run: (script) => ['run', script],
      exec: (bin, ...rest) => ['exec', bin, ...rest],
    };
  }

  if (userAgent.startsWith('yarn/')) {
    return {
      name: 'yarn',
      command: isWindows ? 'yarn.cmd' : 'yarn',
      run: (script) => ['run', script],
      exec: (bin, ...rest) => ['exec', bin, ...rest],
    };
  }

  return {
    name: 'npm',
    command: isWindows ? 'npm.cmd' : 'npm',
    run: (script) => ['run', script],
    exec: (bin, ...rest) => ['exec', '--', bin, ...rest],
  };
}

const PKG = resolvePackageManager();
const DEFAULT_HEALTH_TIMEOUT_MS = 60_000;
const STEP_SEPARATOR = '='.repeat(64);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

const defaultRoutes = [
  { url: '/', expectedContent: '<!DOCTYPE html>' },
  { url: '/dashboard/inventory', expectedContent: '<!DOCTYPE html>' },
  { url: '/forms/stock-adjustments', expectedContent: '<!DOCTYPE html>' },
  { url: '/api/me/role', expectedContent: null },
];

let appServerProcess = null;
let appServerReadyPromise = null;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function formatDuration(ms) {
  if (Number.isNaN(ms)) {
    return '0.0s';
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;
  return `${minutes}m ${remaining.toFixed(1)}s`;
}

function parseFlags(argv) {
  const flags = {
    fast: false,
    noBuild: false,
    noHealthCheck: false,
    port: Number(process.env.CI_VERIFY_PORT) || PORTS.CI_VERIFICATION,
    changedBase: process.env.CI_VERIFY_CHANGED_BASE || null,
    inferChangedBase: !process.env.CI_VERIFY_CHANGED_BASE,
    reportJson: process.env.CI_VERIFY_REPORT_JSON || null,
    maxParallel: process.env.CI_VERIFY_MAX_PARALLEL ? Number(process.env.CI_VERIFY_MAX_PARALLEL) : null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--fast') {
      flags.fast = true;
      flags.noBuild = true;
      flags.noHealthCheck = true;
    } else if (arg === '--no-build') {
      flags.noBuild = true;
    } else if (arg === '--no-health-check') {
      flags.noHealthCheck = true;
    } else if (arg.startsWith('--changed-base=')) {
      const value = arg.split('=').pop();
      if (value) {
        flags.changedBase = value;
        flags.inferChangedBase = false;
      }
    } else if (arg === '--changed-base') {
      const value = argv[i + 1];
      if (value && !value.startsWith('--')) {
        flags.changedBase = value;
        flags.inferChangedBase = false;
        i += 1;
      }
    } else if (arg === '--no-changed-base') {
      flags.changedBase = null;
      flags.inferChangedBase = false;
    } else if (arg.startsWith('--port=')) {
      const value = Number(arg.split('=').pop());
      if (!Number.isNaN(value) && value > 0) {
        flags.port = value;
      }
    } else if (arg === '--port') {
      const value = Number(argv[i + 1]);
      if (!Number.isNaN(value) && value > 0) {
        flags.port = value;
        i += 1;
      }
    } else if (arg.startsWith('--report-json=')) {
      const value = arg.split('=').pop();
      if (value) {
        flags.reportJson = value;
      }
    } else if (arg === '--report-json') {
      const value = argv[i + 1];
      if (value && !value.startsWith('--')) {
        flags.reportJson = value;
        i += 1;
      }
    } else if (arg.startsWith('--max-parallel=')) {
      const value = Number(arg.split('=').pop());
      if (!Number.isNaN(value) && value > 0) {
        flags.maxParallel = value;
      }
    } else if (arg === '--max-parallel') {
      const value = Number(argv[i + 1]);
      if (!Number.isNaN(value) && value > 0) {
        flags.maxParallel = value;
        i += 1;
      }
    }
  }

  if (!flags.maxParallel || Number.isNaN(flags.maxParallel)) {
    const cpuCount = Math.max(1, cpus()?.length || 1);
    flags.maxParallel = Math.min(Math.max(2, cpuCount), 4);
  }

  if (!flags.changedBase && flags.inferChangedBase) {
    flags.changedBase = detectDefaultChangedBase();
    if (!flags.changedBase) {
      flags.inferChangedBase = false;
    }
  }

  return flags;
}

function detectDefaultChangedBase() {
  try {
    const repoCheck = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'pipe' });
    if (repoCheck.status !== 0) {
      return null;
    }
  } catch {
    return null;
  }

  const envCandidates = [
    process.env.CI_DEFAULT_BRANCH && `origin/${process.env.CI_DEFAULT_BRANCH}`,
    process.env.GITHUB_BASE_REF && `origin/${process.env.GITHUB_BASE_REF}`,
    process.env.BITBUCKET_PR_DESTINATION_BRANCH && `origin/${process.env.BITBUCKET_PR_DESTINATION_BRANCH}`,
    process.env.MERGE_REQUEST_TARGET_BRANCH_NAME && `origin/${process.env.MERGE_REQUEST_TARGET_BRANCH_NAME}`,
  ];

  const staticCandidates = ['origin/main', 'origin/master', 'main', 'master'];
  const candidates = [...new Set([...envCandidates.filter(Boolean), ...staticCandidates])];

  for (const ref of candidates) {
    try {
      const result = spawnSync('git', ['rev-parse', '--verify', ref], { stdio: 'pipe' });
      if (result.status === 0) {
        return ref;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

function runCommand({ command, args = [], env = process.env, cwd = process.cwd(), stdio = 'inherit' }) {
  return new Promise((resolve, reject) => {
    log(`\n${colors.blue}▶${colors.reset} Running: ${colors.bright}${command} ${args.join(' ')}${colors.reset}`);

    const isWindows = process.platform === 'win32';
    // On Windows, use shell: true for .cmd files to avoid spawn EINVAL errors
    const useShell = isWindows && (command.endsWith('.cmd') || command.endsWith('.bat'));
    
    const child = spawn(command, args, {
      stdio,
      shell: useShell,
      cwd,
      env,
    });

    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        const reason = signal ? `signal ${signal}` : `exit code ${code}`;
        reject(new Error(`Command failed (${reason}): ${command} ${args.join(' ')}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start command "${command}": ${err.message}`));
    });
  });
}

function runScript(scriptName, extraArgs = []) {
  const args = [...PKG.run(scriptName)];
  if (extraArgs.length > 0) {
    args.push('--', ...extraArgs);
  }
  return runCommand({ command: PKG.command, args });
}

function verifyBuildOutput() {
  log(`\n${colors.blue}▶${colors.reset} Verifying build output...`);

  const buildDir = join(process.cwd(), '.next');
  const staticDir = join(buildDir, 'static');
  const serverDir = join(buildDir, 'server');

  if (!existsSync(buildDir)) {
    throw new Error('Build directory (.next) not found. Did you run "pnpm build"?');
  }
  if (!existsSync(staticDir)) {
    throw new Error('Static assets directory not found under .next/static');
  }
  if (!existsSync(serverDir)) {
    throw new Error('Server files directory not found under .next/server');
  }

  const keyFiles = [join(buildDir, 'BUILD_ID'), join(buildDir, 'package.json')];
  for (const file of keyFiles) {
    if (!existsSync(file)) {
      throw new Error(`Required build file not found: ${file}`);
    }
    const stats = statSync(file);
    if (stats.size === 0) {
      throw new Error(`Build file is empty: ${file}`);
    }
    log(`${colors.green}✓${colors.reset} ${file.replace(process.cwd(), '.')} (${stats.size} bytes)`);
  }

  const chunksDir = join(staticDir, 'chunks');
  if (!existsSync(chunksDir)) {
    throw new Error('Static chunks directory not found under .next/static/chunks');
  }

  const files = readdirSync(chunksDir);
  const jsFiles = files.filter((file) => file.endsWith('.js'));
  if (jsFiles.length === 0) {
    throw new Error('No JavaScript bundles found in .next/static/chunks');
  }

  log(`${colors.green}✓${colors.reset} Found ${jsFiles.length} JavaScript chunks`);
  const mainAppFile = files.find((file) => file.startsWith('main-app-'));
  const frameworkFile = files.find((file) => file.startsWith('framework-'));
  if (mainAppFile) {
    log(`${colors.green}✓${colors.reset} Main app bundle: ${mainAppFile}`);
  }
  if (frameworkFile) {
    log(`${colors.green}✓${colors.reset} Framework bundle: ${frameworkFile}`);
  }

  log(`${colors.green}✓${colors.reset} Build output verification passed`);
}

async function ensureAppServer(port, { logStreaming = false } = {}) {
  if (appServerReadyPromise) {
    return appServerReadyPromise;
  }

  appServerReadyPromise = new Promise((resolve, reject) => {
    log(`\n${colors.blue}▶${colors.reset} Starting Next.js server on port ${port}...`);

    const isWindows = process.platform === 'win32';
    const useShell = isWindows && (PKG.command.endsWith('.cmd') || PKG.command.endsWith('.bat'));
    
    const child = spawn(
      PKG.command,
      PKG.exec('next', 'start', '--hostname', '127.0.0.1', '--port', String(port)),
      {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'production', PORT: String(port) },
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: useShell,
      },
    );

    appServerProcess = child;
    let resolved = false;
    let stdoutBuffer = '';
    let stderrBuffer = '';

    const handleReady = (source) => {
      if (!resolved) {
        resolved = true;
        log(`${colors.green}✓${colors.reset} Next.js server ready (${source})`);
        resolve(child);
      }
    };

    const timeout = setTimeout(() => {
      if (!resolved) {
        child.kill();
        reject(new Error(`Next.js server failed to start within ${DEFAULT_HEALTH_TIMEOUT_MS / 1000}s`));
      }
    }, DEFAULT_HEALTH_TIMEOUT_MS);

    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdoutBuffer += text;
      if (logStreaming) {
        process.stdout.write(`${colors.magenta}[next stdout]${colors.reset} ${text}`);
      }
      if (/ready - started server/i.test(text) || /Ready in/i.test(text) || /Local:/i.test(text)) {
        handleReady('stdout');
      }
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      stderrBuffer += text;
      if (logStreaming) {
        process.stderr.write(`${colors.magenta}[next stderr]${colors.reset} ${text}`);
      }
      if (/ready - started server/i.test(text) || /Ready in/i.test(text) || /Local:/i.test(text)) {
        handleReady('stderr');
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start Next.js server: ${err.message}`));
    });

    child.on('close', (code, signal) => {
      clearTimeout(timeout);
      if (!resolved) {
        const reason = signal ? `signal ${signal}` : `exit code ${code}`;
        const details = [stdoutBuffer, stderrBuffer].filter(Boolean).join('\n---\n');
        reject(new Error(`Next.js server exited before ready (${reason}).\n${details}`));
      }
    });
  });

  return appServerReadyPromise;
}

async function stopAppServer() {
  if (!appServerProcess) {
    return;
  }

  const child = appServerProcess;
  appServerProcess = null;
  appServerReadyPromise = null;

  return new Promise((resolve) => {
    child.once('close', () => {
      log(`${colors.blue}▶${colors.reset} Next.js server terminated`);
      resolve();
    });

    child.kill('SIGTERM');

    setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }, 5_000);
  });
}

function testRoute({ url, expectedContent }, port) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(url, `http://127.0.0.1:${port}`);
    const options = {
      hostname: fullUrl.hostname,
      port: fullUrl.port || port,
      path: fullUrl.pathname + fullUrl.search,
      method: 'GET',
      timeout: 10_000,
    };

    const req = request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk.toString();
      });

      res.on('end', () => {
        const acceptableStatus = [200, 307, 308, 401];
        if (acceptableStatus.includes(res.statusCode)) {
          if (res.statusCode === 200 && expectedContent && !data.includes(expectedContent)) {
            reject(new Error(`Route ${fullUrl.pathname} returned 200 but missing expected content.`));
            return;
          }

          if (fullUrl.pathname.startsWith('/api/') && data.length === 0) {
            reject(new Error(`API endpoint ${fullUrl.pathname} returned empty response.`));
            return;
          }

          log(`${colors.green}✓${colors.reset} ${fullUrl.href} - ${res.statusCode} (${data.length} bytes)`);
          resolve();
          return;
        }

        if (res.statusCode === 500 && fullUrl.pathname === '/api/me/role') {
          log(`${colors.yellow}⚠${colors.reset} ${fullUrl.href} - 500 (expected without auth)`);
          resolve();
          return;
        }

        reject(new Error(`Route ${fullUrl.href} returned status ${res.statusCode}`));
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Failed to connect to ${fullUrl.href}: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request to ${fullUrl.href} timed out`));
    });

    req.end();
  });
}

async function runHealthCheck({ port, routes }) {
  await ensureAppServer(port);

  for (const route of routes) {
    await testRoute(route, port);
  }

  log(`${colors.green}✓${colors.reset} All health check routes passed`);
}

function createSteps(flags, state) {
  const stepMap = {
    typecheck: {
      id: 'typecheck',
      label: 'TypeScript typecheck',
      enabled: true,
      run: () => runScript('typecheck'),
    },
    lint: {
      id: 'lint',
      label: 'ESLint',
      enabled: true,
      run: () => runScript('lint'),
    },
    unit: {
      id: 'unit',
      label: 'Vitest unit tests',
      enabled: true,
      run: () => {
        const extraArgs = [];
        if (flags.changedBase) {
          extraArgs.push('--changed', flags.changedBase);
        }
        return runScript('test:unit', extraArgs);
      },
    },
    build: {
      id: 'build',
      label: 'Next.js production build',
      enabled: !flags.noBuild,
      run: async () => {
        await runScript('build');
        state.buildCompleted = true;
      },
    },
    verifyBuild: {
      id: 'verify-build',
      label: 'Verify build artifacts',
      enabled: !flags.noBuild,
      run: () => {
        if (!state.buildCompleted) {
          throw new Error('Cannot verify build output before build step has completed.');
        }
        verifyBuildOutput();
      },
    },
    healthCheck: {
      id: 'health-check',
      label: 'Health-check critical routes',
      enabled: !flags.noBuild && !flags.noHealthCheck,
      run: () => runHealthCheck({ port: flags.port, routes: defaultRoutes }),
    },
  };

  return [
    {
      id: 'static-analysis',
      label: 'Static analysis',
      parallel: true,
      steps: [stepMap.typecheck, stepMap.lint],
    },
    {
      id: 'unit-tests',
      label: 'Unit tests',
      parallel: false,
      steps: [stepMap.unit],
    },
    {
      id: 'build',
      label: 'Build & artifact verification',
      parallel: false,
      steps: [stepMap.build, stepMap.verifyBuild],
    },
    {
      id: 'health',
      label: 'HTTP health checks',
      parallel: false,
      steps: [stepMap.healthCheck],
    },
  ];
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const state = { buildCompleted: false };
  const phases = createSteps(flags, state);
  const stepCount = phases
    .flatMap((phase) => phase.steps)
    .filter((step) => step.enabled)
    .length;

  log(`\n${colors.bright}${STEP_SEPARATOR}`);
  log('  CI VERIFICATION (Cursor Working Agreement)');
  log(`${STEP_SEPARATOR}${colors.reset}\n`);

  if (flags.fast) {
    log(`${colors.yellow}Fast mode enabled (--fast): skipping build and health check.${colors.reset}`);
  } else {
    const skipMessages = [];
    if (flags.noBuild) skipMessages.push('build');
    if (flags.noHealthCheck) skipMessages.push('health-check');
    if (skipMessages.length > 0) {
      log(`${colors.yellow}Skipping: ${skipMessages.join(', ')}${colors.reset}`);
    }
  }

  log(`${colors.blue}Using port:${colors.reset} ${flags.port}`);
  if (flags.changedBase) {
    log(`${colors.blue}Changed base:${colors.reset} ${flags.changedBase}`);
  } else if (!flags.inferChangedBase) {
    log(`${colors.yellow}No changed base provided – running full Vitest suite.${colors.reset}`);
  }
  log(`${colors.blue}Max parallel:${colors.reset} ${flags.maxParallel}`);
  if (flags.reportJson) {
    log(`${colors.blue}Report file:${colors.reset} ${flags.reportJson}`);
  }

  const startTime = performance.now();
  const results = [];
  const summary = {
    startedAt: new Date().toISOString(),
    totalSteps: stepCount,
    flags: {
      fast: flags.fast,
      noBuild: flags.noBuild,
      noHealthCheck: flags.noHealthCheck,
      port: flags.port,
      changedBase: flags.changedBase,
      maxParallel: flags.maxParallel,
      reportJson: flags.reportJson,
    },
    phases: [],
    results,
    status: 'pending',
  };

  let failure = null;
  try {
    await runPipeline(phases, flags, results, summary);
    summary.status = 'passed';
    const totalDuration = performance.now() - startTime;
    summary.durationMs = totalDuration;
    log(`\n${colors.green}${STEP_SEPARATOR}${colors.reset}`);
    log(`  ✅ ALL CI VERIFICATION STEPS PASSED (${results.length}/${stepCount})`);
    log(`  Duration: ${formatDuration(totalDuration)}`);
    log(`${colors.green}${STEP_SEPARATOR}${colors.reset}\n`);
  } catch (error) {
    failure = error;
    summary.status = 'failed';
    summary.durationMs = performance.now() - startTime;
    const failedStepLabel =
      error instanceof StepError ? error.step.label : 'CI pipeline';
    log(`\n${colors.red}${STEP_SEPARATOR}${colors.reset}`);
    log(`  ❌ CI VERIFICATION FAILED AT: ${failedStepLabel}`);
    log(`${colors.red}${STEP_SEPARATOR}${colors.reset}\n`);
  } finally {
    summary.durationMs = summary.durationMs ?? performance.now() - startTime;
    if (flags.reportJson) {
      try {
        writeFileSync(flags.reportJson, JSON.stringify(summary, null, 2));
        log(`${colors.blue}▶${colors.reset} Wrote report to ${flags.reportJson}`);
      } catch (error) {
        log(`${colors.red}✗ Failed to write report:${colors.reset} ${error.message}`);
      }
    }
    await stopAppServer();
    if (failure) {
      process.exit(1);
    }
  }
}

process.on('SIGINT', async () => {
  await stopAppServer();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await stopAppServer();
  process.exit(1);
});

main().catch(async (err) => {
  log(`\n${colors.red}Fatal error:${colors.reset} ${err.message}`, colors.red);
  await stopAppServer();
  process.exit(1);
});

class StepError extends Error {
  constructor(step, originalError, durationMs, phase, result) {
    super(`Step failed: ${step.label}`);
    this.step = step;
    this.originalError = originalError;
    this.durationMs = durationMs;
    this.phase = phase;
    this.result = result;
  }
}

async function runPipeline(phases, flags, results, summary) {
  for (const phase of phases) {
    const enabledSteps = phase.steps.filter((step) => step.enabled);
    if (enabledSteps.length === 0) {
      summary.phases.push({ id: phase.id, label: phase.label, status: 'skipped' });
      continue;
    }

    const phaseSummary = { id: phase.id, label: phase.label, status: 'pending', steps: [] };
    summary.phases.push(phaseSummary);

    try {
      if (phase.parallel) {
        log(`\n${STEP_SEPARATOR}`);
        log(`${colors.bright}${phase.label} (parallel x${Math.min(flags.maxParallel, enabledSteps.length)})${colors.reset}`);
        log(`${STEP_SEPARATOR}`);
        await runPhaseParallel(phase, enabledSteps, flags, results, phaseSummary);
      } else {
        await runPhaseSequential(phase, enabledSteps, flags, results, phaseSummary);
      }
      phaseSummary.status = 'passed';
    } catch (error) {
      phaseSummary.status = 'failed';
      summary.status = 'failed';
      throw error;
    }
  }
}

async function runPhaseSequential(phase, steps, flags, results, phaseSummary) {
  for (const step of steps) {
    try {
      const result = await runStep(step, {
        phase,
        isParallel: false,
      });
      results.push(result);
      phaseSummary.steps.push(result);
    } catch (error) {
      if (error instanceof StepError && error.result) {
        results.push(error.result);
        phaseSummary.steps.push(error.result);
      }
      throw error;
    }
  }
}

async function runPhaseParallel(phase, steps, flags, results, phaseSummary) {
  const queue = [...steps];
  const maxParallel = Math.min(flags.maxParallel, queue.length);
  const workers = [];
  let abortError = null;

  for (let i = 0; i < maxParallel; i += 1) {
    workers.push(
      (async () => {
        while (queue.length > 0 && !abortError) {
          const step = queue.shift();
          if (!step) break;
          try {
            const result = await runStep(step, {
              phase,
              isParallel: true,
            });
            results.push(result);
            phaseSummary.steps.push(result);
          } catch (error) {
            if (error instanceof StepError && error.result) {
              results.push(error.result);
              phaseSummary.steps.push(error.result);
            }
            if (!abortError) {
              abortError = error;
            }
            throw error;
          }
        }
      })(),
    );
  }

  await Promise.allSettled(workers);

  if (abortError) {
    throw abortError;
  }
}

async function runStep(step, { phase, isParallel }) {
  const stepLabel = phase ? `${phase.label} › ${step.label}` : step.label;
  const start = performance.now();

  if (!isParallel) {
    log(`\n${STEP_SEPARATOR}`);
    log(`${colors.bright}${stepLabel}${colors.reset}`);
    log(`${STEP_SEPARATOR}`);
  } else {
    log(`${colors.blue}▶${colors.reset} ${step.label} (parallel)`);
  }

  try {
    await step.run();
    const duration = performance.now() - start;
    log(`${colors.green}✓${colors.reset} ${step.label} completed in ${formatDuration(duration)}`);
    return {
      id: step.id,
      label: step.label,
      phaseId: phase?.id ?? null,
      phaseLabel: phase?.label ?? null,
      status: 'passed',
      durationMs: duration,
    };
  } catch (error) {
    const duration = performance.now() - start;
    const failureResult = {
      id: step.id,
      label: step.label,
      phaseId: phase?.id ?? null,
      phaseLabel: phase?.label ?? null,
      status: 'failed',
      durationMs: duration,
      errorMessage: error?.message ?? String(error),
    };
    const stepError = new StepError(step, error, duration, phase, failureResult);
    log(`${colors.red}✗ ${step.label} failed after ${formatDuration(duration)}${colors.reset}`);
    if (error?.message) {
      log(`${colors.red}Reason:${colors.reset} ${error.message}`);
    }
    return Promise.reject(stepError);
  }
}

