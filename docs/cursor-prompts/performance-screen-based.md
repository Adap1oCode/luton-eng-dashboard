ROLE
You are a senior Next.js + TS performance reviewer.
Target ONE screen for a performance-only audit. First DISCOVER its exact runtime path; then propose minimal fixes.

SCREEN
<"/forms/stock-adjustments"> - Note this inlcudes View, New, Edit and Delete i.e all related functions.

GUARDRAILS (must remain true)
- SSR page reads via API (absolute URL + forwarded cookies) with Cache-Control: no-store.
- API returns { rows, total } using minimal projection.
- Client island uses TanStack Table; URL is 1-based, table is 0-based (convert exactly once).
- Maintain RLS/impersonation correctness (no cache leaks or stale scoped data).

WORKFLOW (two phases)
PHASE 1 — DISCOVERY FOR THIS SCREEN
1) Route Map
   - Locate the concrete server route for this screen and its SSR loader.
   - Trace: Route → SSR → API (list + item as applicable) → DB/provider → client island → table → pagination/URL sync.
   - Identify the exact lines/modules where 1-based ↔ 0-based conversion occurs.
   - Verify absolute URL + cookie forwarding and no-store on the fetch path(s).

2) Payload & Query Review
   - List visible columns for the screen’s table UI.
   - Compare to the API selection; flag over-fetching or joins/N+1.
   - Propose a minimal projection (explicit column list) and deterministic default sort.

3) Transformation & Churn Audit
   - Catalog toRow/mapper functions, deep clones, JSON stringify/parse, duplicated pagination mapping, unstable getRowId, unnecessary effects.
   - Mark each as Keep / Inline / Remove with rationale.

Deliverables for Phase 1:
- Screen-Specific Runtime Chain (with concrete file/module names you discovered).
- Transformation Audit table.
- Payload Diff → “Displayed columns vs fetched fields” with a minimal projection recommendation.
- Screen Hotspots (ranked) → location → issue → cost → minimal fix (tier + LOC).

PHASE 2 — PLAN FOR THIS SCREEN
- 80/20 Fix Plan (performance only; no rewrites):
  * LOW (≤10 lines): 5–10 items (e.g., clamp 1↔0 conversion at a single boundary, memoize column builders, stabilize getRowId, add router/link prefetch to edit/detail).
  * MEDIUM (11–30 lines, ≤2 files): 3–5 items (e.g., switch list to projection that matches visible columns; consolidate pagination mapping; enforce uniform no-store).
  * HIGH (31–60 lines, ≤2 files): 1–3 items (e.g., unify list+item projection/types; move duplicate client filters into a server whitelist).

For each item include: LOC estimate, Impact, Risk, Complexity, Why safe wrt SSR/RLS.

CHECK AREAS (investigate, don’t assume)
- SSR fetch (absolute URL, cookies, no-store)
- API list endpoint (projection, sort, filters, joins)
- Pagination mapping (ensure single conversion point)
- Table config (columns, getRowId, memoization)
- Mutation flow (optimistic vs confirm; avoid double refetch)
- URL sync loops and effect dependencies

NON-GOALS
- No new features, no component rewrites, no browser SDK lock-in.

SUCCESS CRITERIA
- Concrete, line-referenced causes of clunky loads/refreshes for THIS screen.
- Contained changes (≤60 LOC each, ≤2 files) that reduce extra requests and re-renders.
- Payload trimmed to minimal projection without breaking { rows, total } or RLS safety.
