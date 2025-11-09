# Full Screen Audit - Original Discovery Prompt

**Stock Adjustments & Tally Cards Edit screens — Full Audit**

You are a senior Next.js/TypeScript reviewer. Your task is to perform a discovery-driven audit of the above screen(s) end-to-end and identify the smallest set of changes that cut unnecessary complexity and render/data overhead — without changing behavior.

**Important:** Do not assume file paths. First, find what the code actually does today. If anything is missing to complete your assessment, ask me explicitly before concluding.

## Objectives

Map the runtime path when the user opens the /forms/stock-adjustments/[id]/edit and /forms/tally-cards/[id]/edit screen:

- Route → SSR → API → DB/provider → client island → table → pagination/URL sync

Identify and rank waste:

- Duplicate or unnecessary transformations
- Props/state churn
- Wide payloads
- N+1 reads
- Double pagination conversions
- Re-created column defs
- Deep clones
- JSON stringify/parse loops
- Unstable keys
- Excessive memo/effect usage
- Client-side filtering that duplicates server logic
- URL-sync feedback loops

Produce an 80/20, no-regression action plan (10-15 high benefit and low risk changes), each ≤30 lines. Include complexity if significant rewrite.

## Discovery Process

1. **Code sweep:** Find all files relating to the feature (routes, API handlers, providers, projections, table components, configs).

2. **Trace:** Route → server → API → client → table.

3. **Shape trace:** For every hop, record data shape in/out, transformations, caching, pagination conversions.

4. **Find duplicates:** Functions (`toRow`, filter mapping, pagination logic).

5. **Detect churn:** Rebuilds, remounts, effect loops, column re-creations.

6. **List unused modules and redundant layers.**

7. **Rank hotspots** (by render/network cost).

8. **Draft minimal fixes** (≤10 lines each) and explain why they're safe.

## Output Format

The audit should include the following sections:

### Runtime Trace
- Bullet chain of all hops (file, line range, input/output shape).

### Dependency Map
- How modules relate; note unused/duplicate code.

### Transformation Audit
- Every mapping or coercion (keep / inline / remove).

### Payload & Query Review
- Columns actually displayed vs API fields
- Joins/N+1
- Minimal select recommendation

### Hotspots Ranked
- File:line → issue → cost → minimal fix.

### 80/20 Fix Plan
- 3–6 PR-sized changes (1–10 lines each).

### Guardrails & Non-Goals
- Prevent regressions
- List what not to touch.

### Summary Statistics
- Count of duplicates, wasted conversions, expected gains.

### Next Steps
- Confirm which fixes to implement.

## Rules

- **Don't trust assumptions.** If you can't find a file or it's changed, ask for it.
- **Cite file paths + line ranges** for every finding.
- **Prefer deletion and simplification** over abstraction.
- **Do not implement fixes yet** — produce the report only.
- If you need clarification, ask before guessing.

**Start with the discovery sweep and runtime trace. Ask me for any missing files before continuing.**

---

## Reusable Template

For any screen (e.g., "Requisitions View" or "Purchase Orders View"), just swap the name in bold and paste this into Cursor:

```
Perform a full discovery audit of the [SCREEN NAME] – Edit screen.
Use the same process we used for Stock Adjustments Edit (runtime trace → dependency map → transformation audit → payload check → hotspots → 80/20 plan).
Don't assume file paths — find them dynamically.
Stop after producing the full report (no fixes yet).
Follow the same output structure and safety rules.
```

## What The Output Looks Like

When you run that, Cursor should produce:

- A 7-section Markdown report titled e.g. `EDIT_AUDIT.md` (Save under docs/audit)
- A runtime trace (each hop file + lines)
- A dependency map (modules + duplicates)
- Transformation audit table
- Hotspot ranking + minimal fixes
- 80/20 plan (tiny PRs)
- Guardrails / non-goals / rollback
- Optional summary table of estimated impact

That's the same process that gave you the big detailed audit with:

- "Duplicate toRow"
- "Duplicate filter logic"
- "buildColumns not memoized"
- etc.