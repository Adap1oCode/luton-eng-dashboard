---
description: "Defines branch, diff, and PR discipline after stabilization"
alwaysApply: true
---

# Small-Change Protocol

After the repository has stabilized, all subsequent changes must follow these principles:

- Create a new branch named `cursor/<task-slug>` for each isolated change.
- Show a full PLAN before writing any code or files.
- Keep each change under ~400 lines of diff unless approved otherwise.
- Every PR must pass `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.
- Commit only files relevant to the current task.
- Prefer surgical edits over refactors.
- Merge only through PRs with squash merge enabled and CI green.

Purpose: keep all agents and contributors disciplined, safe, and consistent.
