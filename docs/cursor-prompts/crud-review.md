# CRUD Screen Audit — Discovery Prompt (Config-First)

## Configuration

> **Note:** Edit these values only to customize the audit scope and targets.

```typescript
SCREENS: ["/forms/stock-adjustments", "/forms/tally-cards"]

CRUD_SCOPE: "update only"

LOW_CHANGES_TARGET: 10    // tiny changes, ≤10 lines, single file
MEDIUM_CHANGES_TARGET: 10 // moderate changes, 11–30 lines, 1–2 files, no new components
HIGH_CHANGES_TARGET: 10   // larger contained changes, 31–60 lines, max 2 files, no rewrites

RUNTIME_PATH_TEMPLATE: "Route → SSR → API → DB/provider → client island → table → pagination/URL sync"

API_CONTRACT: "{ rows, total }" // accept { data, count } for SSR compatibility when applicable

PAGINATION_QUERY: "?page=&pageSize=" // 1-based URL, TanStack is 0-based

PERF_FOCUS: [
  "prefetch edit views",
  "reduce payloads",
  "avoid N+1",
  "stabilize keys",
  "trim transforms",
  "eliminate double pagination conversions",
  "caching strategy that preserves RLS correctness"
]

NON_GOALS: [
  "no new features",
  "no component rewrites",
  "no vendor lock-in to browser SDKs"
]

PHASES: ["Phase 1: Low", "Phase 2: Medium", "Phase 3: High"] // manual QA checkpoint after each phase
```

### Architecture Notes

- **SSR/API Pattern**: Keep SSR/API for reads with small client islands; browser must not talk directly to DB. (Per project architecture.)
- **RLS Compliance**: Use absolute URLs and forward cookies in SSR so RLS works.
- **Projection**: List endpoints return `{ rows, total }` and select only columns needed by the table (projection).

---

## Task

You are a senior Next.js/TypeScript reviewer. Perform a **discovery-driven CRUD audit** for each `SCREEN` in `SCREENS`. 

> **⚠️ Critical:** Do not assume paths; find what the code actually does today. If anything is missing to complete the assessment, ask explicitly before concluding.

---

## Objectives

### 1. Map CRUD Runtime

Map CRUD runtime for each `SCREEN` using `RUNTIME_PATH_TEMPLATE`:
- Route → SSR → API (list + item) → DB/provider → client island → table → pagination/URL sync
- Confirm the server calls the API with **absolute URL + forwarded cookies** and **no-store caching**.

### 2. End-to-End CRUD Coverage

#### Create
- Entry points, form load, default data, submit path, success navigation

#### Read
- List view slice, projection (selected columns), sort, filters, pagination correctness

#### Update
- Inline edits vs edit page; status cell; PATCH path; revalidation/refresh

#### Delete
- Row and bulk delete; confirmation; refresh; permission gates

### 3. Identify and Rank Waste

Look for:
- Duplicate transforms (`toRow`, filter mapping)
- Deep clones
- Stringify/parse loops
- Unstable keys
- Re-created column defs
- Double pagination conversions
- Client-side filtering duplicating server logic
- URL-sync feedback loops
- Excess memo/effect usage
- Props/state churn
- Wide payloads
- N+1 reads

> **Call out** any deviations from the shared "View All" architecture (SSR page + client island + API).

### 4. Performance/UX Review

Focus on existing behavior:

- **Prefetch and navigation**: Can edit/detail routes be prefetched (Next Link prefetch or router prefetch) from list rows to avoid slow transitions?
- **Payload trimming**: Can list payloads be trimmed via projection to cut time-to-interactive? (Keep `{ rows, total }` contract.)
- **Data reuse**: Evaluate where data can be reused (e.g., pass already-loaded row into edit page as initial state, fall back to re-fetch to preserve correctness).
- **Redirects**: Identify any slow or redundant redirects during edit/create transitions and propose inline fixes (≤60 lines, max 2 files).
- **RLS correctness**: Maintain RLS correctness; any caching must respect impersonation/session rules.

### 5. Cost-Benefit Analysis

For each recommended change:
- **Impact/Benefit**
- **Risk**
- **Complexity**
- Assign to **Low/Medium/High** tier (see definitions below)
- Provide counts to hit the configured targets

---

## Change Size Tiers

### Low (Tiny)
**≤10 lines, single file, no new imports, no new components**

**Examples:**
- Add `router.prefetch`/`<Link prefetch>` to edit/detail route
- Clamp pagination off-by-one
- Stabilize `getRowId`
- Replace deep clone with shallow
- Remove duplicate `JSON.parse`/`stringify`
- Memoize `buildColumns`

### Medium (Contained)
**11–30 lines, 1–2 files, no new components**

**Examples:**
- Switch list query to projection that matches visible columns
- Consolidate duplicate pagination mapping
- Move filter coercion into a single helper used by API and SSR
- Add `Cache-Control: no-store` consistently
- Ensure absolute URL + cookie forwarding in SSR fetch

### High (Larger but Bounded)
**31–60 lines, max 2 files, no rewrites**

**Examples:**
- Inline-edit save path uses optimistic UI with server confirmation
- Unify list + item endpoints around shared projection/types
- Replace client-side duplicate filter pass with server-side whitelist
- Add small selection-store bridge for bulk actions refresh

> **⚠️ Do not propose:** new features, component rewrites, or changes that break the shared "SSR + small client island" pattern.

---

## Discovery Process

Follow these steps strictly:

1. **Code sweep**: Find all files for each `SCREEN` (routes, API handlers, providers, projections, table components, configs)
   - Use the documented structure as a guide (server page, shell, resource table client, data-table primitives, resource configs, API routes)

2. **Trace**: Route → server → API → client → table
   - Capture fetch init, headers, cookies, cache mode

3. **Shape trace**: At every hop record:
   - Input/output shapes
   - Transforms
   - Caching
   - Pagination conversions

4. **Find duplicates**: `toRow`, filter mapping, pagination mapping

5. **Detect churn**: remounts, effect loops, column re-creations

6. **List unused modules** and redundant layers

7. **Rank hotspots** by render/network cost

8. **Draft minimal fixes** (per tier) and explain why they're safe

---

## Output Format

Produce this exactly:

### 1) Runtime Trace

Bullet chain of all hops:
- File path + line ranges
- Input/output shape
- **Cite where pagination is converted 1-based↔0-based**

### 2) Dependency Map

- Modules and relationships
- Note unused/duplicate code
- Call out deviations from shared shell/table/client island

### 3) Transformation Audit

Table listing every mapping/coercion with action: **keep** / **inline** / **remove**
- Include `stringify`/`parse` and deep clones

| Location | Transformation | Type | Action | Rationale |
|----------|---------------|------|--------|-----------|
| `file:line` | Description | Type | keep/inline/remove | Why |

### 4) Payload & Query Review

- Columns displayed vs API fields
- Joins/N+1
- **Minimal projection recommendation** (exact column list)

### 5) Hotspots Ranked

Format: `file:line → issue → cost → minimal fix (tier)`

Include specific LOC estimates.

### 6) 80/20 Fix Plan

Exactly:
- `LOW_CHANGES_TARGET` low changes
- `MEDIUM_CHANGES_TARGET` medium changes
- `HIGH_CHANGES_TARGET` high changes

Each item:
- Description (≤1 sentence)
- LOC estimate
- Impact/Benefit
- Risk
- Complexity
- Why safe

### 7) Guardrails & Non-Goals

- How to prevent regressions (unit hints)
- What not to touch (per `NON_GOALS`)
- RLS/session & impersonation cautions

### 8) Summary Statistics

Counts:
- Duplicates removed
- Wasted conversions
- Payload shrink (estimated %)
- Render reductions (estimated)

### 9) Phased Plan with QA Breakpoints

**Phase 1 (Low)** → manual QA checklist → **Phase 2 (Medium)** → QA → **Phase 3 (High)** → QA

For each phase, list success criteria (e.g., edit route TTI improved, pagination correct at size change, no RLS regressions).

---

## Special Rules

1. **Don't trust assumptions.** If a needed file is missing or renamed, ask for it before concluding.

2. **Cite file paths + line ranges** for every finding.

3. **Prefer deletion and simplification** over abstraction.

4. **Do not implement fixes yet** — produce the report only.

5. **Maintain the project's SSR + API + client-island architecture** and `{ rows, total }` contract.

---

## Suggested Improvements for Actual Audit

If you were to actually undertake this audit, consider these enhancements:

### 1. Add Automated Discovery Tools

- **Script to trace imports**: Generate dependency graph automatically
- **AST analysis**: Find duplicate transform patterns programmatically
- **Network trace**: Capture actual fetch calls during runtime

### 2. Expand Performance Metrics

- **Lighthouse CI integration**: Baseline performance before/after
- **Bundle size analysis**: Track payload reduction in bytes
- **Render profiling**: Use React DevTools Profiler to quantify churn

### 3. Add Validation Checklist

Create a checklist template for each screen:
- [ ] All CRUD operations tested
- [ ] RLS rules verified
- [ ] Pagination edge cases covered
- [ ] Error states handled
- [ ] Loading states optimized

### 4. Include Comparison Baseline

For each screen, document:
- Current bundle size
- Current TTI (Time to Interactive)
- Current payload size
- Current render count (for key interactions)

### 5. Add Risk Assessment Matrix

For each change, include:
- **Regression risk** (High/Medium/Low)
- **Test coverage** (existing tests cover it?)
- **Rollback plan** (can it be reverted easily?)

### 6. Include Code Examples

In the output format, add:
- **Before/After code snippets** for each proposed change
- **Test cases** that should be added/updated

### 7. Add Architecture Compliance Check

Create a checklist against the documented architecture:
- [ ] Uses SSR for initial load
- [ ] Uses API routes (not direct DB calls from client)
- [ ] Returns `{ rows, total }` contract
- [ ] Uses absolute URLs in SSR
- [ ] Forwards cookies for RLS
- [ ] Uses client islands appropriately

### 8. Include Migration Path

For each change tier, document:
- **Dependencies**: What must be done first?
- **Order**: What's the safest sequence?
- **Breaking changes**: Any API contract changes?

### 9. Add Performance Budgets

Define targets:
- List page TTI: < X seconds
- Edit page load: < Y seconds
- Payload size: < Z KB
- Render count: < N renders per interaction

### 10. Include Tooling Recommendations

Suggest tools that would help:
- React Query DevTools for cache inspection
- Next.js Bundle Analyzer
- Supabase query analyzer
- Network throttling tests
