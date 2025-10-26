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

## Testing & Verification (what “Done” means)
A change is **not done** unless **all** are true:

1) **Typecheck:** `pnpm typecheck` (tsc --noEmit)  
2) **Lint:** `pnpm lint`  
3) **Production build:** `pnpm build` (Next.js)  
4) **App boots + smoke E2E:** Start the built app and run Playwright **@smoke** tests against it  
5) **Unit/Integration:** `pnpm test` (Vitest) passes  
6) **Vercel Preview:** Deployment is green  
7) **Docs updated:** If files under `app/**` or `src/**` changed, update `docs/**` or explicitly mark **no-docs-needed** with a rationale

**One-command verifier (CI + local pre-push):**  
`pnpm ci:verify` must succeed. It runs typecheck, lint, build, boots the app, runs unit + smoke e2e.

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
- `typecheck`, `lint`, `build`, `start`, `test`, `test:e2e`, `test:e2e:smoke`, `ci:verify`

**Pre-push hook (Husky)**  
- Block pushing if `pnpm ci:verify` fails.

**CI (GitHub Actions)**  
- Run `pnpm ci:verify` on PRs and pushes to `main`/`develop`.  
- Fail PR if code changed but `/docs/**` not updated (unless labeled “no-docs-needed”).

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
- Output of `pnpm ci:verify` (or clear failure logs)  
- Vercel preview URL  
- List of updated files (including any `/docs/**`)  
- Explanation if docs are not needed (and apply “no-docs-needed” label)
