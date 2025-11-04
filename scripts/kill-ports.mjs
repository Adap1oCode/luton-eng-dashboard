#!/usr/bin/env node
/**
 * Kills any processes bound to the listed TCP ports.
 * PORT logic:
 * - If ENV PORT is set → only kill that port.
 * - Else kill a small range (defaults 3000-3005) so floating ports are freed up.
 * Customize with DEV_PORTS="3000,3001,3002" if needed.
 */

import kill from 'kill-port';

const envPort = process.env.PORT && String(process.env.PORT).trim();
const listFromEnv = (process.env.DEV_PORTS || '').split(',').map(p => p.trim()).filter(Boolean);
const defaultRange = ['3000', '3001', '3002', '3003', '3004', '3005'];

const ports = envPort ? [envPort] : (listFromEnv.length ? listFromEnv : defaultRange);

(async () => {
  let killed = 0;

  for (const p of ports) {
    try {
      await kill(p, 'tcp');
      console.log(`[kill-ports] Killed process on port ${p}`);
      killed++;
    } catch (err) {
      // No process on that port is fine
      if (!/could not find/i.test(String(err))) {
        console.log(`[kill-ports] Port ${p}: ${err.message || err}`);
      } else {
        console.log(`[kill-ports] No process on port ${p}`);
      }
    }
  }

  console.log(`[kill-ports] Done. Total killed: ${killed}`);
  process.exit(0);
})();




