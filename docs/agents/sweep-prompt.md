---
description: "Performs full verification: type, lint, test, build, env, and reports results"
agentRequested: true
---

# Sweep – Full Repository Verification & Health Check

## Objective
Run a complete verification sweep of the repository to identify all issues (type errors, lint, failing tests, build errors, missing envs) and produce a structured report.

## Behaviour Rules
- Operate read-only by default; no file writes unless requested.
- Auto-detect commands and frameworks:
  - `pnpm`, `npm`, or `yarn` (prefer `pnpm` if present)
  - Next.js, Vitest, Playwright, or other test frameworks
- Create a temporary branch named `cursor/sweep-<yyyy-mm-dd>` for workspace safety.
- Do not modify existing branches.

## Steps

1. **Environment Prep**
   - Detect the project’s package manager and testing framework automatically.
   - Validate `.env.example` vs `.env.local` for parity.

2. **Verification Tasks**
   - Run static checks:
     - TypeScript: `tsc --noEmit`
     - Lint: `eslint .`
     - Prettier: `prettier --check .`
   - Run tests:
     - Unit: `vitest --coverage --reporter=verbose` (if Vitest config found)
     - E2E: `playwright test` (if Playwright config found)
   - Build:
     - For Next.js projects: `next build`
     - For others: standard `build` script from `package.json`.

3. **Report**
   - Parse the outputs and summarize as:
     - **Type / Lint / Format results**
     - **Test summary and coverage %**
     - **Build summary (warnings, errors)**
     - **E2E summary (pass/fail count)**
     - **Env parity summary**
     - **Diff summary** (`git diff main...HEAD --stat`)

4. **Output Format**
   - Produce a markdown-formatted summary:
     ```
     ## Full Repo Health Summary
     **Status:** ✅ Green | 🟧 Partial | ❌ Blockers
     ### Highlights
     - Type errors: ...
     - Tests: ...
     - Build: ...
     - Env diff: ...
     - Recommended next actions
     ```

5. **Artifacts**
   - Save raw logs to `/reports/<yyyy-mm-dd>/` if directory exists.
   - Otherwise, include them inline in the output message.

6. **Safety**
   - Never write or commit any changes.
   - Always operate in read-only mode.
   - Prompt before running heavy tasks if workspace >1000 files.

