# Cursor Working Agreement (Gold Standard)

This document defines the rules Cursor must follow on this project. “Done” means code compiles, the app actually runs, key screens work, docs are updated, tests prove zero regression, and Vercel preview deploys successfully.

---

## Core Principles
- **Free-first mindset:** Always prefer free/built-in options. Do not introduce paid services without explicit approval.
- **No overkill:** Build the smallest solution that meets the need while following industry best practices.
- **Build once, use many times:** Be configuration-driven. Create generic resources/screens so we assemble features, not rewrite them.
- **Zero regression is non-negotiable:** Every change must prove it didn’t break anything.
- **Consultative and iterative:** Propose options, pause for a decision, then deliver in gated phases.

---

## Branching, PRs, and Pace
- **New branch per task.** Create it if missing.
  - Naming: `feat/<area>-<goal>` or `fix/<area>-<bug>` (e.g., `feat/inventory-ssr-pagination`).
- Small, reviewable PRs. One intent per PR.
- **Conventional Commits** for messages (feat, fix, test, refactor, docs, chore).

---

## Testing & Verification (what "Done" means)

We use a **tiered verification system** to balance speed and thoroughness:

### Tier 1: Fast Commit Path (Pre-Commit Hook)
**Command**: `npm run ci:fast`  
**Runtime**: ~25-75 seconds  
**Blocks**: Pre-commit hook  
**Includes**:
- ✅ TypeCheck (`tsc --noEmit`) - **BLOCKS**
- ✅ Lint (`eslint .`) - **BLOCKS**

**Rationale**: Catches syntax/type errors immediately without waiting for tests. Prevents broken code from being committed.

### Tier 2: Pre-Push Verification
**Command**: `npm run ci:verify`  
**Runtime**: ~2-5 minutes  
**Blocks**: Pre-push hook  
**Includes**:
- ✅ TypeCheck - **BLOCKS**
- ✅ Lint - **BLOCKS**
- ✅ Build (`next build`) - **BLOCKS** (ensures app compiles)
- ✅ Unit Tests - **BLOCKS** (can bypass with `--skip-tests` flag in emergencies)

**Bypass**: Use `SKIP_VERIFY=1 git push` for emergencies (not recommended).

**Rationale**: Ensures code compiles and basic tests pass before pushing. Build catches issues typecheck misses.

### Tier 3: PR Verification (GitHub Actions)
**Command**: `npm run ci:pr`  
**Runtime**: ~3-7 minutes  
**Blocks**: PR merge  
**Includes**:
- ✅ All Tier 2 checks
- ✅ Docs check (if code changed) - **BLOCKS**

**Note**: E2E tests are excluded from verification process and run separately in nightly builds.

**Rationale**: Full verification before code review without blocking on E2E tests.

### Tier 4: Nightly Comprehensive (Scheduled)
**Command**: `npm run ci:nightly`  
**Runtime**: ~15-30 minutes  
**Blocks**: Nothing (runs on schedule)  
**Includes**:
- ✅ All Tier 3 checks
- ✅ Integration Tests (`test:nightly`)
- ✅ Full E2E Suite (`test:e2e`)
- ✅ Performance Tests
- ✅ Auto-fix attempts (lint --fix, format, etc.)

**Rationale**: Comprehensive testing without blocking development. Auto-fixes reduce technical debt.

### Complete "Done" Checklist
A change is **not done** unless **all** are true:

1) **Typecheck:** `npm run typecheck` (`tsc --noEmit --incremental`) - ✅ Tier 1  
2) **Lint:** `npm run lint` (ESLint with on-disk cache) - ✅ Tier 1  
3) **Production build:** `npm run build` (Next.js) - ✅ Tier 2  
4) **Unit Tests:** `npm run test` (Vitest) passes - ✅ Tier 2  
5) **CWA Testing Compliance:** Tests follow Clean Web Architecture principles (see `docs/testing/cwa-testing-strategy.md`) - ✅ All tiers  
6) **Vercel Preview:** Deployment is green - ✅ Manual check  
7) **Docs updated:** If files under `app/**` or `src/**` changed, update `docs/**` or explicitly mark **no-docs-needed** with a rationale - ✅ Tier 3

**Note**: E2E tests run separately in nightly builds and are not part of the verification process.

**One-command verifier (CI + local pre-push):**  
Run `npm run ci:verify`. The script auto-detects the active package manager (npm/pnpm/yarn), executes typecheck, lint, Vitest unit suites, performs a production build, verifies build artifacts, and boots the built app for HTTP health checks. Playwright `@smoke` coverage runs in the nightly pipeline.

**Verifier quality-of-life flags:**  
- `--fast` — skip build + health-check for quick iteration (pre-commit).  
- `--no-build`, `--no-health-check` — independently skip heavy phases.  
- `--changed-base=<ref>` — pass through to Vitest `--changed` filtering.  
- `--no-changed-base` — disable automatic base detection and run the full Vitest suite.  
- `--port=<number>` — override the health-check port (defaults to 3005).  
- `--max-parallel=<n>` — cap how many static-analysis steps run concurrently (defaults to CPU-aware value).  
- `--report-json=<path>` — emit a structured summary (per phase + step timings) for telemetry dashboards.

### CWA Testing Requirements
All tests must follow Clean Web Architecture principles:
- **Layer Isolation:** Test each CWA layer (domain, application, infrastructure, presentation) independently
- **Configuration-Driven:** Test generic components with multiple configurations
- **Provider Seam:** Test data layer abstractions and provider transitions
- **Generic Reusability:** Test component reusability across different contexts
- **Performance-First:** Validate performance characteristics of generic components

---

## Phase Gates (how we work with Cursor)
- **Phase 0 — Options:** Present 2 approaches (pros/cons/cost/risk). Wait for decision.
- **Phase 1 — Skeleton:** Create branch, scaffold files & config, SSR/API shape. Pause for review.
- **Phase 2 — Behavior:** Implement logic & tests. Pause for review.
- **Phase 3 — E2E/Smoke:** Add/adjust Playwright @smoke for critical routes. Pause for review.
- **Phase 4 — Polish & Docs:** Address review notes, update `/docs/**`, open PR.

---

## Required Files/Conventions (enforced)
**Package scripts (package.json)**  
- `typecheck`, `lint`, `build`, `start`, `test`, `test:e2e`, `test:e2e:smoke`
- `ci:fast` - Fast commit verification (Tier 1)
- `ci:verify` - Pre-push verification (Tier 2)
- `ci:verify:skip-tests` - Emergency bypass for tests
- `ci:pr` - PR verification (Tier 3)
- `ci:nightly` - Nightly comprehensive (Tier 4)

**Pre-commit hook (Husky)**  
- Block committing if `npm run ci:fast` fails (typecheck + lint only).

**Pre-push hook (Husky)**  
- Block pushing if `npm run ci:verify` fails (can bypass with `SKIP_VERIFY=1` for emergencies).

**CI (GitHub Actions)**  
- Run `npm run ci:pr` on PRs and pushes to `main`/`develop` (includes E2E smoke).  
- Fail PR if code changed but `/docs/**` not updated (unless labeled "no-docs-needed").  
- Nightly workflow runs `npm run ci:nightly` at 2 AM UTC daily (non-blocking).

**Vercel Checks required to merge**  
- Require both: CI “verify” job + “Vercel — Preview Ready”.

**PR Template**  
- Enforce: local `ci:verify` passed, docs updated or explicitly waived, link to Vercel preview, list of tests added.

**Playwright @smoke tests**  
- Hit at least: `/` (home) and the top 1–3 critical routes (e.g. `/dashboard/inventory`).  
- Assert page renders and no console errors.

---

## Cursor MUST follow these at task end
Cursor must include in its final message:  
- Branch name it created  
- Output of `npm run ci:pr` (or clear failure logs) - PR verification includes all tiers  
- Vercel preview URL  
- List of updated files (including any `/docs/**`)  
- Explanation if docs are not needed (and apply "no-docs-needed" label)

### Verification Tier Summary

| Tier | Command | When | Blocks | Runtime |
|------|---------|------|--------|---------|
| 1 | `ci:fast` | Pre-commit | Commit | ~25-75s |
| 2 | `ci:verify` | Pre-push | Push | ~2-5min |
| 3 | `ci:pr` | PR | Merge | ~5-10min |
| 4 | `ci:nightly` | Scheduled | None | ~15-30min |
