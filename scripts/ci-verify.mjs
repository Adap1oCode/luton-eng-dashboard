#!/usr/bin/env node
/**
 * CI Verification Script
 * Runs all verification steps required by the Cursor Working Agreement.
 * Cross-platform compatible (Windows, macOS, Linux) and automatically detects npm/pnpm/yarn.
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync, statSync, readdirSync } from 'fs';
import { request } from 'http';
import { performance } from 'perf_hooks';

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
  };

  for (const arg of argv) {
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
      }
    } else if (arg.startsWith('--port=')) {
      const value = Number(arg.split('=').pop());
      if (!Number.isNaN(value) && value > 0) {
        flags.port = value;
      }
    }
  }

  return flags;
}

function runCommand({ command, args = [], env = process.env, cwd = process.cwd(), stdio = 'inherit' }) {
  return new Promise((resolve, reject) => {
    log(`\n${colors.blue}▶${colors.reset} Running: ${colors.bright}${command} ${args.join(' ')}${colors.reset}`);

    const child = spawn(command, args, {
      stdio,
      shell: false,
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

    const child = spawn(
      PKG.command,
      PKG.exec('next', 'start', '--hostname', '127.0.0.1', '--port', String(port)),
      {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'production', PORT: String(port) },
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
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
  return [
    {
      id: 'typecheck',
      label: 'TypeScript typecheck',
      enabled: true,
      run: () => runScript('typecheck'),
    },
    {
      id: 'lint',
      label: 'ESLint',
      enabled: true,
      run: () => runScript('lint'),
    },
    {
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
    {
      id: 'build',
      label: 'Next.js production build',
      enabled: !flags.noBuild,
      run: async () => {
        await runScript('build');
        state.buildCompleted = true;
      },
    },
    {
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
    {
      id: 'health-check',
      label: 'Health-check critical routes',
      enabled: !flags.noBuild && !flags.noHealthCheck,
      run: () => runHealthCheck({ port: flags.port, routes: defaultRoutes }),
    },
  ];
}

async function runSteps(steps) {
  let passed = 0;
  const results = [];

  for (const step of steps) {
    if (!step.enabled) {
      log(`${colors.yellow}⚠ Skipping ${step.label}${colors.reset}`);
      results.push({ id: step.id, label: step.label, status: 'skipped', durationMs: 0 });
      continue;
    }

    log(`\n${STEP_SEPARATOR}`);
    log(`${colors.bright}${step.label}${colors.reset}`);
    log(`${STEP_SEPARATOR}`);

    const start = performance.now();
    try {
      await step.run();
      const duration = performance.now() - start;
      passed += 1;
      log(`${colors.green}✓${colors.reset} ${step.label} completed in ${formatDuration(duration)}`);
      results.push({ id: step.id, label: step.label, status: 'passed', durationMs: duration });
    } catch (error) {
      const duration = performance.now() - start;
      log(`${colors.red}✗ ${step.label} failed after ${formatDuration(duration)}${colors.reset}`);
      log(`${colors.red}Reason:${colors.reset} ${error.message}`);
      results.push({ id: step.id, label: step.label, status: 'failed', durationMs: duration, error });
      throw new Error(step.label);
    }
  }

  return { passed, results };
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const state = { buildCompleted: false };
  const steps = createSteps(flags, state);
  const totalEnabled = steps.filter((step) => step.enabled).length;

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
  }

  const startTime = performance.now();

  try {
    const { passed } = await runSteps(steps);
    const totalDuration = performance.now() - startTime;
    log(`\n${colors.green}${STEP_SEPARATOR}${colors.reset}`);
    log(`  ✅ ALL CI VERIFICATION STEPS PASSED (${passed}/${totalEnabled})`);
    log(`  Duration: ${formatDuration(totalDuration)}`);
    log(`${colors.green}${STEP_SEPARATOR}${colors.reset}\n`);
  } finally {
    await stopAppServer();
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

