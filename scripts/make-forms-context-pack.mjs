#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * ChatGPT Forms Context Pack builder
 * - Produces a compact bundle focused on FORMS (screens, sections, hooks, types, data providers, mock data).
 * - Node 18+.
 */

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execCb);

// ------- Config (FORMS-ONLY) -------
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'forms_context_pack');
const ZIP_PATH = path.join(ROOT, 'forms_context_pack.zip');

// Always include these whole files if present (useful context)
const includeFullFiles = [
  'package.json',
  'tsconfig.json',
  'next.config.js',
  'next.config.mjs',
  'tailwind.config.js',
  'tailwind.config.ts',
  'postcss.config.js',
  'postcss.config.cjs',
  'eslint.config.js',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  'shadcn.json',
  'README.md',
  'docs/forms-architecture.md',       // if present
];

// Folders to include **in full** (small & high-signal for forms)
const includeFullDirs = [
  // Forms screens (all features under forms)
  'src/app/(main)/forms',
  // Form UI primitives and shared components (small)
  'src/components',                    // shadcn wrappers / shared inputs
  'src/theme',
  'src/styles',
  // Data provider seam used by forms
  'src/lib/data',
  // Mock datasets used by mock provider
  'src/data/mock',
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

// Max size to embed file fully; larger files -> only head snippet
const MAX_FULL_BYTES = 120 * 1024;

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

function isUnderAny(p, roots) {
  const norm = p.replaceAll('\\','/');
  return roots.some(r => norm.includes(r.replaceAll('\\','/')));
}

async function collectTree() {
  // We only collect tree under the whitelisted dirs to keep it forms-focused
  const all = [];
  for (const base of includeFullDirs) {
    const abs = path.join(ROOT, base);
    if (!fssync.existsSync(abs)) continue;
    for await (const f of walk(abs)) {
      all.push(f);
    }
  }
  const rels = all.map(f => path.relative(ROOT, f)).sort();
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
      // Only record routes that live under forms
      if (!rel.includes('/(main)/forms/')) continue;
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

// Heuristics that are useful for forms
function detectPatterns(content) {
  const findings = [];

  // Forms stack
  if (/react-hook-form/.test(content)) findings.push('reactHookForm');
  if (/\bzod\b/.test(content)) findings.push('zod');
  if (/@tanstack\/react-table/.test(content) || /useReactTable/.test(content)) {
    findings.push('tanstackTable');
  }

  // ShadCN UI usage
  if (/@\/components\/ui\//.test(content)) findings.push('shadcnUi');

  // Data provider seam
  if (/lib\/data\/providers\/mock|lib\/data\/provider|dataProvider/.test(content)) findings.push('dataProvider');

  // Raw HTML inputs/tables (possible places to standardize)
  if (/<table[\s>]/.test(content)) findings.push('rawTable');
  if (/<input[\s>]/.test(content) && !/from ["']@\/components\/ui\/input["']/.test(content)) {
    findings.push('rawInput');
  }

  // Tailwind smells
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
    } catch {
      // ignore unreadable
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
    const tarPath = ZIP_PATH.replace(/\.zip$/, '.tar.gz');
    await exec(`tar -czf ${JSON.stringify(tarPath)} .`, { cwd: OUT_DIR, windowsHide: true });
  }
}

async function writeReadme() {
  const md = `# Forms Context Pack

This bundle includes only **forms-related** code and data:
- \`src/app/(main)/forms/**\` (screens, sections, hooks, screen-level types)
- \`src/lib/data/**\` (canonical types, DataProvider contract, mock provider)
- \`src/data/mock/**\` (JSON datasets)
- Select shared UI (\`src/components/**\`), theme, and styles

Use this when you want ChatGPT to reason strictly about *forms* — not dashboards or unrelated features.
`;
  await writeText('README.md', md);
}

async function main() {
  console.log('Building FORMS context pack...');
  if (fssync.existsSync(OUT_DIR)) await fs.rm(OUT_DIR, { recursive: true, force: true });
  await ensureDir(OUT_DIR);

  const files = await collectTree();
  await depsSummary();
  await gatherRoutes();
  await scanCode(files);
  await copyCritical();
  await writeReadme();
  await makeZip();

  console.log(`\n✅ Done. Upload this file here:\n${ZIP_PATH}\n`);
  console.log('Contents placed in forms_context_pack/ for inspection if needed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
