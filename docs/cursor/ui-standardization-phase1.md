## Phase 1 — UI Standardization Skeleton

### Scope Recap
- Directive: Review `src/app/(main)` pages for shadcn/tweakcn alignment and responsive consistency.
- Strategy: Option A (systematic audit + quick-win refactors), targeting low-risk pages first.
- Current focus: Identify immediate refactor candidates and required supporting primitives before deeper passes.

### Audit Highlights (Quick-Win Candidates)
- **Auth (login/register)**  
  - Issues: bespoke gradient layout, raw form wrappers, duplicated structural markup, inconsistent palette tokens, limited small-screen affordances.  
  - Quick-Win Fix: introduce shared `AuthShell` using shadcn `Card`, `Button`, `Input`, `Separator`; apply theme tokens and consistent padding.
- **Unauthorized**  
  - Issues: raw `Link` styled as button, no shadcn wrappers, spacing tokens off.  
  - Quick-Win Fix: swap to `Card` + `Button`, align icon sizing to design tokens, ensure focus-visible states come from components.
- **Dashboard landing/about**  
  - Issues: placeholder markup (`Coming Soon`, bare `div`).  
  - Quick-Win Fix: add standardized `EmptyState` pattern (carded illustration/headline CTA) for consistent look.
- **Dashboard quick tiles**  
  - Generally aligned but contains manual brand colors (`text-blue-600`).  
  - Quick-Win Fix: map to semantic tokens (e.g., `text-primary`, `text-muted-foreground`) and centralize KPI badge helpers.
- **Admin / Table Docs Monitor**  
  - Mostly compliant; lingering custom colors (`text-blue-600`, `text-orange-600`).  
  - Quick-Win Fix: swap to semantic utilities & shared helpers for status coloring.
- **Tools / Screen Generator**  
  - Heavy bespoke styling with raw `<select>`/`<input>`.  
  - Quick-Win Fix (deferred): replace with shadcn form primitives once shell patterns proven on smaller pages.

### Proposed Skeleton Deliverables
- Create shared primitives:
  - `AuthShell` (layout) and `AuthHeroPane` partials to eliminate duplication.
  - `StatusBadge` helper for admin dashboards using semantic variants.
  - `EmptyStateCard` component for placeholder routes.
- Refactor quick-win pages to use the primitives (no functional changes).
- Document token mapping guidelines for future passes.

### Risks & Checks
- All updates retain existing data flow; only presentational changes.
- Regression guard: run `pnpm ci:verify` after each batch; smoke auth routes manually.
- Docs: keep this log updated per phase; add route-specific notes once refactors land.

### Next Step (Phase 1 Approval Gate)
- Confirm targets & primitives above before implementing refactors in Phase 2.
