#!/usr/bin/env node
// -----------------------------------------------------------------------------
// FILE: scripts/gen-screen-interactive.mjs
// PURPOSE: Phase 3 (step 1) — minimal interactive generator scaffold
// NOTES:
//  - Safe, incremental: no external deps, supports --dry-run, no writes by default
//  - Discovers available resources from src/lib/data/resources/index.ts (by import)
//  - Prints a summary plan; future steps will add prompts and file writes
// -----------------------------------------------------------------------------

import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

// Basic CLI flags (no deps): --dry-run, --resource, --route, --title
const argv = process.argv.slice(2);
const flags = Object.fromEntries(
  argv
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [k, v] = arg.replace(/^--/, "").split("=");
      return [k, v ?? true];
    }),
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "");

function logInfo(message) {
  process.stdout.write(`ℹ ${message}\n`);
}

function logWarn(message) {
  process.stdout.write(`⚠ ${message}\n`);
}

function logError(message) {
  process.stderr.write(`⨯ ${message}\n`);
}

// Lightweight dynamic import helper for TS files via Next/ts-node transpilation is not available here.
// We rely on the fact that the resources index is JS/TS compiled by ts-node at runtime in app,
// so for the generator we read the file to statically detect available keys as a safe first step.
function discoverResourcesFromSource() {
  const indexPath = path.resolve(repoRoot, "src", "lib", "data", "resources", "index.ts");
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Resource index not found at ${indexPath}`);
  }
  const src = fs.readFileSync(indexPath, "utf8");

  // Heuristic: find exported keys or map entries like export const ALL_RESOURCES = { key: {...} }
  const resourceKeyRegex = /\b(key|resourceKey)\s*:\s*['"]([a-zA-Z0-9_\-]+)['"]/g;
  const found = new Set();
  let match;
  while ((match = resourceKeyRegex.exec(src))) {
    const key = match[2];
    if (key) found.add(key);
  }

  // Fallback: look for known exports like export const resources = { users: ..., ... }
  const objectKeyRegex = /\b([a-zA-Z0-9_\-]+)\s*:\s*\{/g;
  if (found.size === 0) {
    while ((match = objectKeyRegex.exec(src))) {
      const key = match[1];
      // Skip obvious non-resource keys
      if (key && !["export", "import", "default"].includes(key)) {
        found.add(key);
      }
    }
  }

  return Array.from(found).sort();
}

function kebabCase(input) {
  return String(input)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

function titleCase(input) {
  return String(input)
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

async function main() {
  const isDryRun = Boolean(flags["dry-run"] ?? true); // default to dry-run for safety
  const resources = discoverResourcesFromSource();
  if (resources.length === 0) {
    logWarn("No resources discovered. Ensure src/lib/data/resources/index.ts exports resource keys.");
  }

  // Determine initial defaults
  const selectedResource = flags.resource || resources[0] || "users";
  const routeSegment = flags.route || kebabCase(selectedResource);
  const title = flags.title || titleCase(routeSegment);
  const apiEndpoint = flags.api || `/api/${selectedResource}`;

  // Summary preview only (no writes in this initial step)
  logInfo("Screen generator (Phase 3 - step 1)");
  logInfo(`Mode: ${isDryRun ? "DRY RUN" : "WRITE"}`);
  logInfo(`Discovered resources: ${resources.length ? resources.join(", ") : "(none)"}`);
  logInfo("Plan:");
  logInfo(`  • resourceKey: ${selectedResource}`);
  logInfo(`  • routeSegment: ${routeSegment}`);
  logInfo(`  • title: ${title}`);
  logInfo(`  • apiEndpoint: ${apiEndpoint}`);
  logInfo("Files to generate (preview):");
  logInfo(`  • src/app/(main)/forms/${routeSegment}/page.tsx`);
  logInfo(`  • src/app/(main)/forms/${routeSegment}/view.config.tsx`);
  logInfo(`  • src/app/(main)/forms/${routeSegment}/toolbar.config.tsx`);
  logInfo(`  • src/app/(main)/forms/${routeSegment}/${routeSegment}-client.tsx`);
  logInfo(`  • src/app/(main)/forms/${routeSegment}/${routeSegment}-error-boundary.tsx`);

  if (!isDryRun) {
    logWarn("Write mode is not yet implemented in this step. Use --dry-run (default).\n");
  }

  // Exit success
  process.exit(0);
}

main().catch((err) => {
  logError(err?.stack || String(err));
  process.exit(1);
});


