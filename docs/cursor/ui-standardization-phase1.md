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

### Screen Status Matrix

Legend — ✅ Standardized, 🟡 Needs tweaks, 🔴 Needs overhaul  
Focus for Phase 2 quick wins: prioritize 🔴 first, then high-impact 🟡.

| Route | File | Status | Notes |
| --- | --- | --- | --- |
| `/auth/v1/login` | `src/app/(main)/auth/v1/login/page.tsx` | ✅ | Uses shared `AuthShell` + `AuthHeroPane`; responsive layout and shadcn buttons. |
| `/auth/v1/register` | `src/app/(main)/auth/v1/register/page.tsx` | ✅ | Mirrors login on shared shell with hero pane + semantic footer link. |
| `/unauthorized` | `src/app/(main)/unauthorized/page.tsx` | ✅ | Rebuilt with `EmptyStateCard` + shadcn `Button`; ready for reuse elsewhere. |
| `/dashboard` | `src/app/(main)/dashboard/page.tsx` | ✅ | Placeholder now uses `EmptyStateCard` with CTA to default dashboard. |
| `/dashboard/default` | `src/app/(main)/dashboard/default/page.tsx` | 🟡 | Widget shell relies on shadcn but hardcodes brand colors; remap to semantic tokens. |
| `/dashboard/requisitions` | `src/app/(main)/dashboard/requisitions/page.tsx` | 🟡 | Uses generic dashboard shell; needs token cleanup and removal of debug logging in widgets. |
| `/dashboard/requisitions/new` | `src/app/(main)/dashboard/requisitions/new/page.tsx` | 🔴 | Large bespoke form/table with raw inputs and custom focus states; rebuild on shadcn forms/table primitives. |
| `/dashboard/requisitions/all` | `src/app/(main)/dashboard/requisitions/all/page.tsx` | 🔴 | Custom data grid implementation; migrate to resource-table for consistency/responsiveness. |
| `/dashboard/purchase-orders` | `src/app/(main)/dashboard/purchase-orders/page.tsx` | 🟡 | Same dashboard shell; ensure metrics widgets use semantic colors and remove debug artifacts. |
| `/dashboard/about` | `src/app/(main)/dashboard/about/page.tsx` | 🔴 | Empty stub; needs standardized copy/illustration treatment. |
| `/dashboard/forms/audit` | `src/app/(main)/dashboard/forms/audit/page.tsx` | 🟡 | Structure sound but buttons still raw; convert to shadcn `Button`/`Card` and tighten spacing. |
| `/dashboard/inventory` | `src/app/(main)/dashboard/inventory/page.tsx` | 🟡 | Shares dashboard widgets, but includes floating debug card and hard-coded utility classes. |
| `/admin/table-docs-monitor` | `src/app/(main)/admin/table-docs-monitor/page.tsx` | 🟡 | Uses shadcn components but color utilities are manual; migrate to semantic tokens & shared badge helper. |
| `/performance` | `src/app/(main)/performance/page.tsx` | 🟡 | Dashboard cards rely on raw `text-blue-*`/`text-green-*`; swap to semantic palette and reuse KPI badge helper. |
| `/tools/screen-generator` | `src/app/(main)/tools/screen-generator/page.tsx` | 🔴 | Entire UI is bespoke (native inputs/selects, borders); requires comprehensive redesign on shadcn/tweakcn primitives. |
| `/forms/products` | `src/app/(main)/forms/products/page.tsx` | 🟡 | Shares `PageShell`; needs shell brought in line with shadcn cards and toolbar components. |
| `/forms/stock-adjustments%20copy` | `src/app/(main)/forms/stock-adjustments copy/page.tsx` | 🔴 | Legacy duplicate route with space in segment; decommission or rename before styling pass. |
| `/forms/stock-adjustments%20copy/new` | `src/app/(main)/forms/stock-adjustments copy/new/page.tsx` | 🔴 | Uses legacy `FormShell` with raw buttons; prefer shared `ResourceFormSSRPage` once duplicate removed. |
| `/forms/stock-adjustments%20copy/[id]/edit` | `src/app/(main)/forms/stock-adjustments copy/[id]/edit/page.tsx` | 🔴 | Same duplicate flow; relies on manual button styles via `ResourceFormSSRPage`. |
| `/forms/stock-adjustments` | `src/app/(main)/forms/stock-adjustments/page.tsx` | 🟡 | `PageShell` + custom toolbar; align shell with shadcn card/layout tokens. |
| `/forms/stock-adjustments/new` | `src/app/(main)/forms/stock-adjustments/new/page.tsx` | 🟡 | `FormShell` actions use raw buttons; switch to shadcn `Button` and standard footer partial. |
| `/forms/stock-adjustments/[id]/edit` | `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx` | 🟡 | `ResourceFormSSRPage` primary/secondary buttons themed manually; update shared component. |
| `/forms/tally-cards` | `src/app/(main)/forms/tally-cards/page.tsx` | 🟡 | `PageShell` usage; needs same shell refactor for cards/toolbars. |
| `/forms/tally-cards/new` | `src/app/(main)/forms/tally-cards/new/page.tsx` | 🔴 | `FormShell` with raw buttons and missing shadcn layout primitives. |
| `/forms/tally-cards/[id]/edit` | `src/app/(main)/forms/tally-cards/[id]/edit/page.tsx` | 🟡 | Dependent on `ResourceFormSSRPage`; fix shared button/spacing styles. |
| `/forms/inventory-current` | `src/app/(main)/forms/inventory-current/page.tsx` | 🟡 | `PageShell` shell tweaks required; content grid responsive but shell not yet shadcn card-based. |
| `/forms/inventory-unique` | `src/app/(main)/forms/inventory-unique/page.tsx` | 🟡 | Same `PageShell` alignment task as other list screens. |
| `/forms/requisitions` | `src/app/(main)/forms/requisitions/page.tsx` | 🔴 | Custom requisition builder with mixed styling; needs shadcn section cards, tabs, and buttons. |
| `/forms/warehouse-locations` | `src/app/(main)/forms/warehouse-locations/page.tsx` | 🟡 | `PageShell` shell cleanup needed; ensure filters use shared components. |
| `/forms/warehouse-locations/new` | `src/app/(main)/forms/warehouse-locations/new/page.tsx` | 🟡 | `FormShell` actions with raw anchor/button; migrate to shadcn `Button` + `Link`. |
| `/forms/warehouse-locations/[id]/edit` | `src/app/(main)/forms/warehouse-locations/[id]/edit/page.tsx` | 🟡 | `ResourceFormSSRPage` adjustments (buttons, card spacing). |
| `/forms/roles` | `src/app/(main)/forms/roles/page.tsx` | 🔴 | Entire page is bespoke (custom layout, drag/drop, manual colors); requires full redesign on shadcn table primitives. |
| `/forms/roles/new` | `src/app/(main)/forms/roles/new/page.tsx` | 🔴 | Gradient backdrop, bespoke toolbar, inline SVG; rebuild using shared `FormShell` successors. |
| `/forms/roles/[id]` | `src/app/(main)/forms/roles/[id]/page.tsx` | 🔴 | Empty file; implement detail view or remove route. |
| `/forms/roles/[id]/edit` | `src/app/(main)/forms/roles/[id]/edit/page.tsx` | 🟡 | Client form uses shadcn components but still has manual borders/colors; harmonize tokens & spacing. |
| `/forms/users` | `src/app/(main)/forms/users/page.tsx` | 🟡 | `PageShell` shell updates needed; table client already shadcn-based. |
| `/forms/warehouses` | `src/app/(main)/forms/warehouses/page.tsx` | 🟡 | Same shell adjustments as other list screens. |
| `/forms/warehouses/new` | `src/app/(main)/forms/warehouses/new/page.tsx` | 🟡 | `FormShell` buttons/links need migration to shared shadcn components. |
| `/forms/warehouses/[id]/edit` | `src/app/(main)/forms/warehouses/[id]/edit/page.tsx` | 🟡 | `ResourceFormSSRPage` tweaks (button variants, spacing). |
| `/forms/compare-stock` | `src/app/(main)/forms/compare-stock/page.tsx` | 🟡 | `PageShell` shell adjustments; ensure quick filters reuse shared components. |
| `/forms/compare-stock-adjustments` | `src/app/(main)/forms/compare-stock-adjustments/page.tsx` | 🟡 | Relies on `ResourceSSRPage`; fix shared shell/button styling. |
