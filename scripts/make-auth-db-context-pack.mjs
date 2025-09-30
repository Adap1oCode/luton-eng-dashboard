#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * ChatGPT Auth+DB Context Pack builder
 * - Focused on authentication + Supabase connection (browser+SSR), middleware, guards, actions, and route handlers.
 * - Node 18+.
 */
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execCb);

// ------- Config (AUTH + DB) -------
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "auth_db_context_pack");
const ZIP_PATH = path.join(ROOT, "auth_db_context_pack.zip");

// Always include these whole files if present (useful context)
const includeFullFiles = [
  "package.json",
  "tsconfig.json",
  "next.config.js",
  "next.config.mjs",
  "tailwind.config.js",
  "tailwind.config.ts",
  "postcss.config.js",
  "postcss.config.cjs",
  "eslint.config.js",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.json",
  "README.md",
  "docs/auth-architecture.md",
  "docs/db-architecture.md",
  "middleware.ts",          // root delegator (if used)
  ".env.example",
];

// Folders/paths to include **in full** (auth + db related)
const includeFullDirsOrFiles = [
  "src/lib/supabase.ts",
  "src/lib/supabase-server.ts",     // if exists (legacy helper)
  "src/server",                     // server actions
  "src/middleware.ts",              // src middleware entry
  "src/middleware",                 // a folder, if you keep helpers here
  "src/app/(main)/auth",            // login/callback/actions UI + routes
  "src/app/api",                    // route handlers (db-check, health, etc.)
  "src/app/(main)/dashboard/layout.tsx", // auth guard
  "supabase",                       // migrations/functions/config if present
];

// Exclusions (secrets/heavy/generated)
const EXCLUDE_DIRS = new Set([
  "node_modules",".git",".next","out","dist","build",".turbo",".vercel",".cache",".DS_Store"
]);
const EXCLUDE_FILES = [
  /^\.env(\..+)?$/i,
  /.*\.(pem|key|crt|p12|pfx)$/i,
  /^\.?terraform/i,
];

// Extensions to scan for patterns
const CODE_EXTS = new Set([".ts",".tsx",".js",".jsx",".mjs",".cjs",".json",".md"]);

// Max size to embed file fully; larger -> head snippet
const MAX_FULL_BYTES = 160 * 1024;

// ----------------- helpers -----------------
function matchesExcludedFile(name) {
  return EXCLUDE_FILES.some(rx => rx.test(name));
}
async function ensureDir(p) { await fs.mkdir(p, { recursive: true }); }
async function writeJson(relPath, obj) {
  const outPath = path.join(OUT_DIR, relPath);
  await ensureDir(path.dirname(outPath));
  await fs.writeFile(outPath, JSON.stringify(obj, null, 2), "utf8");
}
async function writeText(relPath, text) {
  const outPath = path.join(OUT_DIR, relPath);
  await ensureDir(path.dirname(outPath));
  await fs.writeFile(outPath, text, "utf8");
}
async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (EXCLUDE_DIRS.has(e.name)) continue;
    if (matchesExcludedFile(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}
async function copyFileAs(rel, dstRel) {
  const src = path.join(ROOT, rel);
  if (!fssync.existsSync(src)) return false;
  const dst = path.join(OUT_DIR, dstRel);
  await ensureDir(path.dirname(dst));
  await fs.copyFile(src, dst);
  return true;
}
async function copyFull(rel) {
  const abs = path.join(ROOT, rel);
  if (!fssync.existsSync(abs)) return;
  const stat = await fs.stat(abs);
  if (stat.isDirectory()) {
    for await (const f of walk(abs)) {
      const relFile = path.relative(ROOT, f);
      await copyFileAs(relFile, path.join("_full", relFile));
    }
  } else {
    await copyFileAs(rel, path.join("_full", rel));
  }
}
async function readHead(file, maxBytes = 24 * 1024) {
  const fd = await fs.open(file, "r");
  try {
    const { size } = await fd.stat();
    const len = Math.min(size, maxBytes);
    const buf = Buffer.alloc(len);
    await fd.read(buf, 0, len, 0);
    return { size, head: buf.toString("utf8") };
  } finally {
    await fd.close();
  }
}

// Detect auth/DB usage to collect context even outside the include list
function isAuthDbFileContent(content) {
  return [
    /@supabase\/ssr/, /@supabase\/supabase-js/,
    /createServerClient/, /createBrowserClient/,
    /supabase\.auth\./, /signInWithOtp/, /signInWithPassword/,
    /exchangeCodeForSession/, /getUser\(/,
    /middleware/, /NextRequest/, /NextResponse/,
    /redirect\(.+auth\/v1\/login/, // guards
    /\/auth\/v1\/callback/,
  ].some(rx => rx.test(content));
}

async function scanAndCopyRelevant() {
  const picked = [];
  const roots = ["src"]; // broad scan, but we only copy snippets/full for relevant files
  for (const base of roots) {
    const abs = path.join(ROOT, base);
    if (!fssync.existsSync(abs)) continue;
    for await (const f of walk(abs)) {
      const rel = path.relative(ROOT, f);
      const ext = path.extname(rel);
      if (!CODE_EXTS.has(ext)) continue;
      try {
        const { size, head } = await readHead(f, MAX_FULL_BYTES + 1);
        if (!isAuthDbFileContent(head)) continue;
        picked.push({ file: rel, size });
        const content = size <= MAX_FULL_BYTES ? head : head.slice(0, MAX_FULL_BYTES);
        const target = size <= MAX_FULL_BYTES
          ? path.join("_files", rel)
          : path.join("_snippets", rel + ".head.txt");
        await writeText(target, content);
      } catch { /* ignore unreadable */ }
    }
  }
  await writeJson("scan_auth_db_files.json", picked.sort((a,b)=>a.file.localeCompare(b.file)));
}

async function collectRoutes() {
  const routes = [];
  const candidates = ["src/app","app","pages"].map(d => path.join(ROOT, d)).filter(f => fssync.existsSync(f));
  for (const base of candidates) {
    for await (const f of walk(base)) {
      const rel = path.relative(ROOT, f);
      if (!/\.(tsx|ts|jsx|js)$/.test(rel)) continue;
      if (/(^|\/)api\//.test(rel) || /\/auth\/v1\//.test(rel) || /\/callback\//.test(rel)) {
        routes.push(rel);
      }
    }
  }
  await writeJson("routes.json", { routes });
}

async function depsSummary() {
  const p = path.join(ROOT, "package.json");
  if (!fssync.existsSync(p)) return;
  try {
    const pkg = JSON.parse(await fs.readFile(p, "utf8"));
    const deps = {
      name: pkg?.name,
      private: pkg?.private,
      scripts: pkg?.scripts ?? {},
      dependencies: pkg?.dependencies ?? {},
      devDependencies: pkg?.devDependencies ?? {},
    };
    await writeJson("dependencies.json", deps);
  } catch {/*ignore*/}
}

async function writeReadme() {
  const md = `# Auth + DB Context Pack

This bundle focuses on **authentication and Supabase connectivity** for your Next.js app.

### What’s included
- **Helpers**: \`src/lib/supabase.ts\`, \`src/lib/supabase-server.ts\` (if present)
- **Server actions**: \`src/server/**\`
- **Middleware**: \`middleware.ts\` (root delegator, if present), \`src/middleware.ts\`, \`src/middleware/**\`
- **Auth UI/routes**: \`src/app/(main)/auth/**\` (login, actions, callback)
- **API routes**: \`src/app/api/**\` (e.g., db-check, health)
- **Dashboard guard**: \`src/app/(main)/dashboard/layout.tsx\`
- **Supabase project** (if committed): \`/supabase/**\` (migrations, functions)

### Extra artifacts
- \`routes.json\`: auth/api routes discovered
- \`scan_auth_db_files.json\`: files across \`src/**\` that reference Supabase/auth patterns
- \`_full/**\`: full copies of critical files/folders
- \`_files/**\` and \`_snippets/**\`: per-file content or head-only snippets (for large files)
- \`dependencies.json\`: deps and scripts from package.json

### Not included
- Secrets (\`.env*\`, keys, certs) and heavy build outputs (\`.next/**\`, \`node_modules/**\`)
- Large files are truncated to a head snippet to keep this pack compact.

### How this is used
Share this context pack to debug:
- SSR cookie wiring (\`@supabase/ssr\` getAll/setAll),
- middleware guards and redirects,
- auth UI flows (password + magic link),
- API handlers and DB access patterns.

`;
  await writeText("README.md", md);
}

async function listTree() {
  const files = [];
  for await (const f of walk(ROOT)) {
    const rel = path.relative(ROOT, f);
    // Skip huge trees; just list what we’ll copy in full sets
    if (rel.startsWith("node_modules") || rel.startsWith(".next")) continue;
  }
  // Build a specific tree of what we actually copied fully:
  const copied = [];
  const base = path.join(OUT_DIR, "_full");
  if (fssync.existsSync(base)) {
    for await (const f of walk(base)) {
      copied.push(path.relative(base, f));
    }
  }
  await writeText("tree_full.txt", copied.sort().join("\n"));
}

async function copyCritical() {
  for (const f of includeFullFiles) await copyFull(f);
  for (const p of includeFullDirsOrFiles) await copyFull(p);
}

async function makeZip() {
  try {
    await exec(`zip -r ${JSON.stringify(ZIP_PATH)} .`, { cwd: OUT_DIR, windowsHide: true });
  } catch {
    const tarPath = ZIP_PATH.replace(/\.zip$/, ".tar.gz");
    await exec(`tar -czf ${JSON.stringify(tarPath)} .`, { cwd: OUT_DIR, windowsHide: true });
  }
}

async function main() {
  console.log("Building AUTH+DB context pack...");
  if (fssync.existsSync(OUT_DIR)) await fs.rm(OUT_DIR, { recursive: true, force: true });
  await ensureDir(OUT_DIR);

  await depsSummary();
  await copyCritical();
  await scanAndCopyRelevant();
  await collectRoutes();
  await listTree();
  await writeReadme();
  await makeZip();

  console.log(`\n✅ Done. Pack at:\n${ZIP_PATH.replace(/\\/g,"/")}`);
  console.log("Contents placed in auth_db_context_pack/ for inspection.");
}

main().catch(e => { console.error(e); process.exit(1); });
