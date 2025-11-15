/**
 * Centralized Port Configuration
 * 
 * This file defines all ports used by the application to prevent conflicts
 * and make troubleshooting easier.
 * 
 * Port Allocation Strategy:
 * - 3000-3009: Main application ports
 * - 3010-3019: Development/testing ports
 * - 3020-3029: CI/testing ports
 * - 3030-3039: Health check ports
 */

import { createServer } from 'net';

export const PORTS = {
  // Main Application Ports
  PRODUCTION: 3000,           // Production server
  DEVELOPMENT: 3001,          // Development server (npm run dev)
  
  // Testing Ports
  TEST: 3002,                 // Unit/integration tests
  E2E: 3003,                  // End-to-end tests
  
  // CI/Verification Ports
  CI_HEALTH_CHECK: 3004,      // CI health check server
  CI_VERIFICATION: 3005,      // CI verification server
  
  // Health Check Ports
  HEALTH_CHECK_DEV: 3006,     // Development health checks
  HEALTH_CHECK_PROD: 3007,    // Production health checks
  
  // Reserved for future use
  RESERVED_1: 3008,
  RESERVED_2: 3009,
} as const;

/**
 * Get the appropriate port for the current environment
 */
export function getPortForEnvironment(env: 'development' | 'production' | 'test' | 'ci'): number {
  switch (env) {
    case 'development':
      return PORTS.DEVELOPMENT;
    case 'production':
      return PORTS.PRODUCTION;
    case 'test':
      return PORTS.TEST;
    case 'ci':
      return PORTS.CI_HEALTH_CHECK;
    default:
      return PORTS.DEVELOPMENT;
  }
}

/**
 * Check if a port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
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

/**
 * Find the next available port starting from the specified port
 */
export async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort} after ${maxAttempts} attempts`);
}

/**
 * Port usage documentation
 */
export const PORT_USAGE = {
  [PORTS.PRODUCTION]: 'Production server (npm run start)',
  [PORTS.DEVELOPMENT]: 'Development server (npm run dev)',
  [PORTS.TEST]: 'Unit/integration tests',
  [PORTS.E2E]: 'End-to-end tests (Playwright)',
  [PORTS.CI_HEALTH_CHECK]: 'CI health check server',
  [PORTS.CI_VERIFICATION]: 'CI verification server',
  [PORTS.HEALTH_CHECK_DEV]: 'Development health checks',
  [PORTS.HEALTH_CHECK_PROD]: 'Production health checks',
} as const;
