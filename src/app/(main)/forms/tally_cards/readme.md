Tally Card Manager — Context & Goals

Business context
Operations keep physical Tally Cards to record inbound/outbound quantities. Accuracy varies: sometimes the cards are right, sometimes the IMS is.

Purpose
Provide a fast, reliable way to view, validate, and reconcile Tally Card data against IMS data. The app is an additional control — not a replacement.

Strategic goals

Ship screens quickly (config-first, reuse everywhere).

Keep data access provider-agnostic (Supabase today, swappable tomorrow).

Prefer SSR/API for reads with small client islands for interactivity.

Lean on shadcn/ui and TanStack Table for consistent UX with no bespoke table logic.

Architecture — Principles (Rails we won’t break)

API-first pages: every screen reads via a Next.js API route (server) or SSR loader. Browser does not talk to the DB.

Stable response shape: { rows, total } across resources. We also accept { data, count } in SSR to be compatible with Supabase defaults.

Single shared table system: generic DataTable (TanStack) fed by per-screen config.tsx. No forks.

Provider abstraction: API route uses a data provider (Supabase server client today). We can swap providers behind the API with zero page changes.

No-store by default on read endpoints to avoid hydration drift/stale HTML.

Config over code: columns, features, toolbar defined in each screen’s config.tsx.

UX conventions: left sticky expander column; optional checkbox selection; pagination & resize persisted per view.

SSR fetch correctness: server fetch uses an absolute URL and forwards cookies so RLS/session works server-side.

Current Implementation Status (View Tally Cards)
What’s now in place

SSR page: src/app/(main)/forms/tally_cards/page.tsx

Fetches from /api/tally_cards with no-store.

Builds an absolute URL from request headers.

Forwards cookies so the API runs under the same user session (RLS works).

Parses both { rows, total } (our standard) and { data, count } (Supabase).

Shared Server Shell: src/components/forms/shell/page-shell.tsx (+ render-button-client.tsx helper)

Provides page chrome (title, toolbar rows, chips, footer slot).

Server-compatible by default.

Generic Client Island: src/components/forms/resource-view/resource-table-client.tsx

No fetching. Receives { config, initialRows, initialTotal, page, pageSize }.

Uses shared DataTable primitives.

SSR-driven pagination via URL changes.

Defensive getRowId.

Config-driven columns: src/app/(main)/forms/tally_cards/config.tsx

Remains the single source for columns/features/defaults.

Integrates with view-defaults from the data-table package (override where needed).

API route: src/app/api/tally_cards/route.ts

Returns { rows, total } with Cache-Control: no-store.

Uses Supabase server client.

Range pagination consistent with page and pageSize.

What we deliberately did not change

DataTable primitives (kept intact):
src/components/data-table/data-table.tsx
src/components/data-table/data-table-column-header.tsx
src/components/data-table/data-table-pagination.tsx
src/components/data-table/data-table-expander-cell.tsx

view-defaults remains the base for quick screen setup; forms can override in their config.tsx.

Legacy shells under forms/tally_cards/sections/ are retained for now; we’re standardising on the shared shell in components/forms/shell/.

Folder Structure (agreed)
src/
├─ app/
│  └─ (main)/
│     └─ forms/
│        └─ <resource>/
│           ├─ page.tsx                # Server page: fetches data, forwards cookies, renders Shell + client island
│           └─ config.tsx              # Resource-specific columns/features/defaults (overrides view-defaults)
│
└─ components/
   └─ forms/
      ├─ shell/
      │  ├─ page-shell.tsx             # Shared server shell (kebab-case)
      │  └─ render-button-client.tsx   # Client helper for toolbar buttons
      └─ resource-view/
         └─ resource-table-client.tsx  # Generic client island (uses DataTable primitives)


Naming: new shared components use kebab-case filenames.

Data Flow (now)

SSR Page builds absolute URL and forwards cookies → calls /api/<resource>?page=&pageSize= with { cache: 'no-store' }.

API Route queries provider (Supabase server client) with range and count: "exact" → returns { rows, total }.

SSR Page parses { rows, total } (or { data, count }), then renders:
PageShell (server) → ResourceTableClient (client island) → DataTable (primitives).

Pattern to Reuse (for every new “View All” screen)
1) API Route (server, no-store)

Create src/app/api/<resource>/route.ts:

Accept page, pageSize (later: q, filters).

Use server client (or PostgREST URL) and return { rows, total }.

Set no-store.

Contract

Select only columns required by the table (keep payload tight).

Deterministic sort (default ASC on a stable column).

Pagination: from = (page-1)*pageSize, to = from + pageSize - 1.

2) Page (SSR)

Create/modify src/app/(main)/forms/<resource>/page.tsx:

Build absolute URL from headers.

Forward cookies so RLS works.

Fetch with no-store.

Parse { rows, total } (also accept { data, count }).

Render PageShell → ResourceTableClient with { config, initialRows, initialTotal, page, pageSize }.

3) Config (per resource)

Create src/app/(main)/forms/<resource>/config.tsx:

Column defs (accessor, header via DataTableColumnHeader, cell).

Optional toolbar/features overrides.

No data fetching in config.

4) Shell (shared)

Use components/forms/shell/page-shell.tsx for consistent chrome (title, toolbar rows, chips, footer).
Use render-button-client.tsx for button rendering where needed.

Guardrails / Do & Don’t

Do

Fetch on server (API/SSR) with no-store.

Keep API output stable: { rows, total }.

Keep UI generic and under components/forms/**.

Forward cookies from SSR to API to preserve session/RLS.

Use kebab-case for shared component filenames.

Don’t

Don’t couple pages to the vendor SDK in the browser.

Don’t put business logic in components — keep it in API/data.

Don’t fork the DataTable primitives.

Don’t ship relative URLs in SSR fetches (must be absolute).

Operational Checklists
New Screen Checklist (5 minutes)

Create src/app/api/<resource>/route.ts → { rows, total }, no-store.

Create src/app/(main)/forms/<resource>/config.tsx → columns/features.

Create src/app/(main)/forms/<resource>/page.tsx → SSR fetch (absolute URL + cookies), render Shell + ResourceTableClient.

Verify /api/<resource>?page=1&pageSize=50 returns data.

Load the page and confirm count/rows/pagination.

Troubleshooting (fast)

API returns data in browser, but page shows 0: missing cookie forwarding in SSR.

Type errors on toolbar arrays: import ToolbarButton from components/forms/shell/types.

Rows render but selection/expansion unstable: set/get a stable getRowId in the client island (already included).

Slow list: trim selected columns; ensure DB indexes on sort/filter fields.

Decisions (recorded)

Render strategy: SSR + small client islands (table interactivity only).

Data path: Page → API → Provider. No browser DB calls.

Auth: SSR fetches forward cookies to API so RLS/session applies.

API shape: { rows, total } (also accepting { data, count } at the page).

Structure: Shared UI under components/forms/** (shell/, resource-view/), per-screen config under app/(main)/forms/<resource>/.

What’s Next

Extend API pagination with q/filters (server-side).

Add total everywhere and wire server-side pagination fully (already supported).

Promote any remaining per-screen shells to components/forms/shell/ (retire legacy shells once unused).

Introduce a tiny DataProvider interface in API routes to swap Supabase later with one file change.

Optional: add a small scaffolder to generate route.ts, config.tsx, and page.tsx for a new resource.

Summary of recent changes

Replaced Tally Cards page with SSR wrapper that builds an absolute URL and forwards cookies.

Added a shared Server Shell and a generic Resource Table Client under components/forms/**.

Kept DataTable primitives and view-defaults unchanged.

Locked the API contract to { rows, total }.