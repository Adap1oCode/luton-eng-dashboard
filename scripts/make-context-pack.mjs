#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * ChatGPT Context Pack builder
 * - Produces a sanitized, compact bundle of your codebase so ChatGPT can reason holistically.
 * - Node 18+.
 */

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execCb);

// ------- Config (tweak to taste) -------
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'chatgpt_context_pack');
const ZIP_PATH = path.join(ROOT, 'chatgpt_context_pack.zip');

// Always include these whole files if present
const includeFullFiles = [
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'tsconfig.json',
  'next.config.js',
  'next.config.mjs',
  'tailwind.config.js',
  'tailwind.config.ts',
  'postcss.config.js',
  'postcss.config.cjs',
  'vite.config.ts',
  'vite.config.js',
  'eslint.config.js',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  'shadcn.json',
];

// Folders to include **in full** (small & high-signal)
const includeFullDirs = [
  'src/components',                       // all shared components
  'src/app/(main)/dashboard/inventory',   // full inventory dashboard
  'src/app/(main)/dashboard/requisitions',// full requisitions dashboard
  'src/theme',
  'src/styles',
  'app',                                  // catch-all app router
  'pages',
  'src/services',
];

// Patterns to exclude (secrets, heavy, generated)
const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', '.next', 'out', 'dist', 'build', '.turbo', '.vercel', '.cache', '.DS_Store'
]);
const EXCLUDE_FILES = [
  /^\.env(\..+)?$/,
  /.*\.(pem|key|crt|p12|pfx)$/i,
  /^\.?terraform/,
];

// Extensions we care about scanning
const CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.scss', '.json', '.md']);

// Max size in bytes to embed file fully; larger files -> only head snippet
const MAX_FULL_BYTES = 120 * 1024;

// Feature directories to include fully if present
const featureDirs = [
  'src/app/(main)/dashboard/inventory',
  'src/app/(main)/dashboard/requisitions',
  'src/app/(main)/dashboard/purchase-orders',
  'src/app/(main)/dashboard/forms',
];

// ----------------------------------------

function matchesExcludedFile(name) {
  return EXCLUDE_FILES.some(rx => rx.test(name));
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (EXCLUDE_DIRS.has(e.name)) continue;
    if (matchesExcludedFile(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

function isUnder(p, ancestors) {
  const norm = p.replaceAll('\\','/');
  return ancestors.some(a => norm.includes(a));
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function writeJson(relPath, obj) {
  const outPath = path.join(OUT_DIR, relPath);
  await ensureDir(path.dirname(outPath));
  await fs.writeFile(outPath, JSON.stringify(obj, null, 2), 'utf8');
}

async function writeText(relPath, text) {
  const outPath = path.join(OUT_DIR, relPath);
  await ensureDir(path.dirname(outPath));
  await fs.writeFile(outPath, text, 'utf8');
}

async function copyFullFile(rel) {
  const src = path.join(ROOT, rel);
  const dst = path.join(OUT_DIR, '_full', rel);
  if (!fssync.existsSync(src)) return;
  await ensureDir(path.dirname(dst));
  await fs.copyFile(src, dst);
}

async function collectTree() {
  const files = [];
  for await (const f of walk(ROOT)) {
    files.push(f);
  }
  const rels = files.map(f => path.relative(ROOT, f)).sort();
  await writeText('tree.txt', rels.join('\n'));
  return rels;
}

async function gatherRoutes() {
  const routes = [];
  const candidates = ['app', 'pages']
    .map(d => path.join(ROOT, d))
    .filter(d => fssync.existsSync(d));
  for (const base of candidates) {
    for await (const f of walk(base)) {
      const rel = path.relative(ROOT, f);
      if (/\.(tsx|ts|jsx|js)$/.test(rel)) routes.push(rel);
    }
  }
  await writeJson('routes.json', { routes });
}

async function readHead(file, maxBytes = 16 * 1024) {
  const fd = await fs.open(file, 'r');
  try {
    const { size } = await fd.stat();
    const len = Math.min(size, maxBytes);
    const buf = Buffer.alloc(len);
    await fd.read(buf, 0, len, 0);
    return { size, head: buf.toString('utf8') };
  } finally {
    await fd.close();
  }
}

function detectPatterns(content) {
  const findings = [];

  // TanStack Table
  if (/@tanstack\/react-table/.test(content) || /useReactTable/.test(content)) {
    findings.push('tanstackTable');
  }

  // react-hook-form + zod
  if (/react-hook-form/.test(content)) findings.push('reactHookForm');
  if (/\bzod\b/.test(content)) findings.push('zod');

  // raw table/input usage
  if (/<table[\s>]/.test(content)) findings.push('rawTable');
  if (/<input[\s>]/.test(content) && !/from ["']@\/components\/ui\/input["']/.test(content)) {
    findings.push('rawInput');
  }

  // ShadCN UI usage
  if (/@\/components\/ui\//.test(content)) findings.push('shadcnUi');

  // TweakCN mention
  if (/TweakCN|tangerine|tweakcn/i.test(content)) findings.push('tweakcn');

  // Tailwind smells: arbitrary hex colors / arbitrary rounded
  if (/bg-\[#|text-\[#|border-\[#/i.test(content)) findings.push('arbitraryHexColor');
  if (/rounded-\[|\bshadow-\[/i.test(content)) findings.push('arbitraryRoundedOrShadow');

  return findings;
}

async function scanCode(files) {
  const reports = [];
  for (const rel of files) {
    const ext = path.extname(rel);
    if (!CODE_EXTS.has(ext)) continue;
    const abs = path.join(ROOT, rel);
    try {
      const { size, head } = await readHead(abs, MAX_FULL_BYTES + 1);
      const content = size <= MAX_FULL_BYTES ? head : head.slice(0, MAX_FULL_BYTES);
      const patterns = detectPatterns(content);
      reports.push({ file: rel, size, patterns });
      // Save full or head snippet
      const target = size <= MAX_FULL_BYTES
        ? path.join('_files', rel)
        : path.join('_snippets', rel + '.head.txt');
      await writeText(target, content);
    } catch (e) {
      // Ignore binary/unreadable
    }
  }
  await writeJson('scan_report.json', reports);

  // Summaries
  const counts = {};
  for (const r of reports) {
    for (const p of r.patterns) counts[p] = (counts[p] || 0) + 1;
  }
  await writeJson('scan_summary.json', counts);
}

async function copyCritical() {
  for (const f of includeFullFiles) await copyFullFile(f);
  for (const d of includeFullDirs) {
    const abs = path.join(ROOT, d);
    if (!fssync.existsSync(abs)) continue;
    for await (const f of walk(abs)) {
      const rel = path.relative(ROOT, f);
      await copyFullFile(rel);
    }
  }
  for (const d of featureDirs) {
    const abs = path.join(ROOT, d);
    if (!fssync.existsSync(abs)) continue;
    for await (const f of walk(abs)) {
      const rel = path.relative(ROOT, f);
      await copyFullFile(rel);
    }
  }
}

async function readJsonSafe(rel) {
  const p = path.join(ROOT, rel);
  if (!fssync.existsSync(p)) return null;
  try {
    return JSON.parse(await fs.readFile(p, 'utf8'));
  } catch { return null; }
}

async function depsSummary() {
  const pkg = await readJsonSafe('package.json');
  const deps = {
    dependencies: pkg?.dependencies ?? {},
    devDependencies: pkg?.devDependencies ?? {},
    scripts: pkg?.scripts ?? {},
    name: pkg?.name,
    private: pkg?.private,
  };
  await writeJson('dependencies.json', deps);
}

async function makeZip() {
  // Minimal zip using system 'zip' if available; else tar.gz
  try {
    await exec(`zip -r ${JSON.stringify(ZIP_PATH)} .`, { cwd: OUT_DIR, windowsHide: true });
    return;
  } catch {
    // fallback tar.gz
    const tarPath = ZIP_PATH.replace(/\.zip$/, '.tar.gz');
    await exec(`tar -czf ${JSON.stringify(tarPath)} .`, { cwd: OUT_DIR, windowsHide: true });
  }
}

async function main() {
  console.log('Building ChatGPT context pack...');
  if (fssync.existsSync(OUT_DIR)) await fs.rm(OUT_DIR, { recursive: true, force: true });
  await ensureDir(OUT_DIR);

  const files = await collectTree();
  await depsSummary();
  await gatherRoutes();
  await scanCode(files);
  await copyCritical();

  await makeZip();

  console.log(`\n✅ Done. Upload this file here:\n${ZIP_PATH}\n`);
  console.log('Contents placed in chatgpt_context_pack/ for inspection if needed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
