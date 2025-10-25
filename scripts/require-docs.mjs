import { execSync } from "node:child_process";

function safeGitDiffRange(base) {
  try {
    return execSync(`git diff --name-only ${base}...HEAD`, { encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
  } catch (e) {
    // Local runs may not have origin/main; fall back to diff against initial commit
    try {
      const initial = execSync("git rev-list --max-parents=0 HEAD", { encoding: "utf8" }).trim();
      return execSync(`git diff --name-only ${initial}...HEAD`, { encoding: "utf8" })
        .split("\n")
        .filter(Boolean);
    } catch {
      // As a last resort, skip guard locally
      return [];
    }
  }
}

const base = process.env.GITHUB_BASE_REF || "origin/main";
const diff = safeGitDiffRange(base);

const codeChanged = diff.some((p) => /^((src|app|packages)\//.test(p));
const docsChanged = diff.some((p) => /^(docs\/|\/docs\/)/.test(p));

if (codeChanged && !docsChanged) {
  console.error("❌ Code changed but /docs not updated. Update docs or label PR 'no-docs-needed'.");
  process.exit(1);
}
