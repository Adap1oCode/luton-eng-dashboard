---
description: "Performs a Working Agreement audit and stabilizes the repo automatically"
agentRequested: true
---

# Builder – Working Agreement Audit & Stabilization

## Objective
Perform an automated audit and stabilization of the repository according to our Cursor Working Agreement.

You must:
- Detect and verify all core guardrails.
- Self-create and work on an isolated branch.
- Produce a human-readable report with next actions.

## Behaviour Rules
- Always start by creating a new branch named `cursor/auto-audit-<yyyy-mm-dd>`.
- Never touch `main` or other non-cursor branches.
- Always **plan first** before making any file changes.
- Auto-approve all **read-only** commands; require approval for writes.

## Steps

1. **Discovery**
   - Locate the working agreement and related files under:
     - `.cursor/rules/cursor-working-agreement.mdc`
     - `.cursor/settings.json`
     - `package.json` → check for `typecheck`, `lint`, `test`, `build` scripts.
     - `.github/workflows/*` → verify CI presence.
   - Confirm Plan Mode and Git Worktrees are active in settings.

2. **Audit**
   - Check for compliance with:
     - Plan Mode default enabled.
     - Branch sandbox pattern (`cursor/<task-slug>`).
     - Allow-list policy (auto-approve reads, prompt for writes, never push/merge/reset-hard).
     - Pre-PR checks (types, lint, test, build).
     - Vercel/CI required before merge.
     - Small-change protocol (<400 line diffs).

3. **Validate Config**
   - Ensure `.cursor/settings.json` and `.cursor/allowlist.json` exist and contain required sections.
   - Confirm `scripts/repo-health.sh` or equivalent health check exists.

4. **Stabilization**
   - Where issues exist, propose minimal, local changes:
     - Add missing scripts to `package.json`.
     - Add missing `.cursor/` configs.
     - Adjust `.github/workflows` for type/lint/test steps.
   - Show exact file and diff before applying.

5. **Reporting**
   - Produce a concise summary with three sections:
     1. **Blocking Issues (must fix)**
     2. **Partial Compliance (recommended fixes)**
     3. **Complete / Passing Checks**

6. **Safety**
   - Never merge automatically.
   - Never delete or overwrite files outside `.cursor`, `.github`, or `package.json`.
   - Ask for approval before writing.

## Output
At completion, print:
- A markdown summary (Blocking / Partial / Complete)
- The name of the branch created
- Paths of files touched or modified
