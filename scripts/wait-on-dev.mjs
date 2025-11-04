#!/usr/bin/env node
/**
 * Waits for the Next.js dev server to respond on a specific route, then exits 0.
 * 
 * Defaults to checking /forms/stock-adjustments (a meaningful app route that confirms
 * the app is fully initialized, not just the server listening).
 * 
 * Enhanced to detect build errors:
 * - Checks HTTP status (fails on 5xx errors)
 * - Optionally runs typecheck first if RUN_TYPECHECK=true
 * - Provides better error reporting
 * 
 * If PORT not set, defaults to 3000 (Next will auto-bump if busy, so this
 * script also tries the next few ports unless WAIT_ON_STRICT is set).
 * 
 * Customize the health check route with HEALTH_CHECK_PATH env var.
 * Example: HEALTH_CHECK_PATH=/api/health npm run dev:check
 */

import { spawn } from 'child_process';
import { platform } from 'os';
import http from 'http';

const strict = process.env.WAIT_ON_STRICT === 'true';
const basePort = Number(process.env.PORT || '3000');
const healthCheckPath = process.env.HEALTH_CHECK_PATH || '/forms/stock-adjustments/';
const tries = strict ? [basePort] : [basePort, basePort + 1, basePort + 2, basePort + 3, basePort + 4];
const runTypecheck = process.env.RUN_TYPECHECK === 'true';

/**
 * Check HTTP response status code (not just if server responds)
 */
function checkHttpStatus(port, path) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:${port}${path}`;
    const req = http.get(url, { timeout: 5000 }, (res) => {
      const statusCode = res.statusCode;
      res.resume(); // Consume response to free up memory
      
      // 5xx errors indicate server-side build/runtime errors
      if (statusCode >= 500) {
        reject(new Error(`Server returned ${statusCode} error - likely build/runtime error`));
      } else if (statusCode >= 400) {
        // 4xx might be auth redirects, which is OK for health check
        resolve(statusCode);
      } else {
        resolve(statusCode);
      }
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Run typecheck before health check
 */
function runTypeCheck() {
  return new Promise((resolve, reject) => {
    const isWindows = platform() === 'win32';
    const child = spawn(isWindows ? 'npm.cmd' : 'npm', ['run', 'typecheck'], {
      stdio: 'inherit',
      env: process.env
    });

    child.on('exit', code => {
      if (code === 0) {
        console.log('[wait-on-dev] Typecheck passed ✓');
        resolve();
      } else {
        reject(new Error('Typecheck failed - fix TypeScript errors before starting server'));
      }
    });
  });
}

/**
 * Wait for server to respond (using wait-on for retry logic)
 */
function waitOn(url) {
  return new Promise((resolve, reject) => {
    const isWindows = platform() === 'win32';
    const child = spawn(isWindows ? 'npx.cmd' : 'npx', ['wait-on', `http-get://${url}`, '--timeout', '30000'], {
      stdio: 'inherit',
      env: process.env
    });

    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`wait-on failed for ${url}`)));
  });
}

(async () => {
  // Optionally run typecheck first
  if (runTypecheck) {
    try {
      await runTypeCheck();
    } catch (error) {
      console.error('[wait-on-dev] Typecheck failed:', error.message);
      process.exit(1);
    }
  }

  // Wait for server to respond
  for (const p of tries) {
    try {
      const url = `localhost:${p}${healthCheckPath}`;
      await waitOn(url);
      
      // Now check HTTP status to catch build errors
      try {
        const statusCode = await checkHttpStatus(p, healthCheckPath);
        console.log(`[wait-on-dev] Server up and responding on http://localhost:${p}${healthCheckPath} (${statusCode})`);
        process.exit(0);
      } catch (error) {
        console.error(`[wait-on-dev] Server responded but with error: ${error.message}`);
        console.error(`[wait-on-dev] This likely indicates a build or runtime error. Check the Next.js dev server output above.`);
        process.exit(1);
      }
    } catch {
      // try next port
    }
  }

  console.error(`[wait-on-dev] Failed to detect dev server on ${tries.map(p => `:${p}`).join(', ')} (checked ${healthCheckPath})`);
  process.exit(1);
})();
