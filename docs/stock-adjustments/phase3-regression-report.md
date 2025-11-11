---
title: Stock Adjustments Phase 3 Regression Notes
description: Context and follow-up actions for the Phase 3 server/client optimizations that introduced regressions on 2025-11-11.
---

# Overview

On 2025‑11‑11 we attempted the “Phase 3” performance pass for the stock adjustments edit screen. The goal was to remove N+1 server queries and avoid redundant location writes while keeping the parent/child SCD2 pattern intact. We introduced:

- A helper RPC `fn_stock_adjustment_load_edit(p_id uuid)` that returns the latest SCD2 entry, its warehouse, and child locations in one round trip.
- Server changes in `page.tsx` to call that RPC instead of issuing several Supabase selects.
- Client changes in `stock-adjustment-form-wrapper.tsx` to normalize location payloads, fingerprint the originals, and only re-run the multi-step “patch parent → sync locations → finalize totals” flow when necessary.
- API changes in `patch-scd2/route.ts` so responses reuse the helper RPC to hydrate `child_locations`.

Although these optimizations reduced query count, they introduced regressions that prevent multi-location edits from loading or saving correctly.

# Code Changes

| File | Purpose |
| --- | --- |
| `supabase/migrations/20251111_add_fn_stock_adjustment_load_edit.sql` | Defines the new helper RPC. |
| `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx` | Uses the helper RPC to load defaults/options and to preload locations. |
| `src/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper.tsx` | Adds location normalization/fingerprinting and conditional writes. |
| `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts` | Reuses the helper RPC to attach `child_locations` to API responses. |

## Helper RPC Summary

```sql
fn_stock_adjustment_load_edit(p_id uuid) -> (
  entry_id uuid,
  tally_card_number text,
  warehouse_id uuid,
  locations jsonb
)
```

1. Resolve the anchor `tally_card_number` for the requested id.
2. Find the latest SCD2 row for that tally card (fallback to the provided id).
3. Return the latest entry id, anchor, resolved warehouse, and `jsonb_agg` of child locations for that entry.

This function is meant to be reusable for other SCD2 screens with child tables.

# Regressions Observed

## 1. Existing Multi-Location Rows Load with Empty Locations

**Symptom:** Visiting `/forms/stock-adjustments/<id>/edit` shows an empty “Locations” table and the form displays validation errors (“Select location… / Expected string, received null”). Network tab shows the helper RPC returning the correct JSON, but the React form renders nothing.

**Root cause:**

- `StockAdjustmentFormWrapper` receives `defaults.locations` from `getRecordForEdit`.
- The helper RPC also returns `preloadedLocations`, but in `page.tsx` we keep `defaults.locations` if it exists (even when it’s an empty array from the API). That empty array wins and wipes out the helper data.
- Result: the client thinks there are zero locations, which forces `multi_location` validation errors and breaks the edit experience.

**Repro:**  
1. Pick an existing multi-location row (e.g. Tally card `RTZ-01` with locations `G5, G3, G4, G2`).  
2. Open `/forms/stock-adjustments/<id>/edit`.  
3. Observe empty locations array and red validation banners.

## 2. Converting Single-Location → Multi-Location No Longer Persists

**Symptom:** Toggle “Multi-location” on an entry that previously had a single location, add new location rows, click “Update”. Toast says “Update successful”, but `/locations` response is `{"locations":[]}` and the list view shows the entry unchanged.

**Root cause:**

- We now derive locations from `currentLocations` (react-hook-form watch) and from `values.locations`.
- When the toggle flips to multi, the form emits the old single location as `location` + `qty`, but `locations` array is still empty until the user clicks “Add Location”.  
- `normalizeLocations` therefore sees an empty `effectiveLocationsSource` and posts `[]` to the `/locations` endpoint.
- Because the POST succeeded, we skip the second SCD2 call: parent row stays single-location and child table remains empty.

**Repro:**  
1. Open any single-location entry.  
2. Toggle multi-location, try adding breakdown rows, click Update.  
3. Network tab shows `PUT /locations` → `{"locations":[]}` and the data layer remains unchanged.

## 3. Potential Additional Edge Cases (Not yet verified)

- **Multi-location → single-location**: the new guard clears locations only if it detects a previous breakdown. Worth retesting after revert to ensure we still remove child rows when forced back to single mode.
- **Hash consistency**: we rely on parent `qty`/`location` only being sent in the second call. If any branch skips the second call by mistake (e.g., fingerprint false positive), we risk stale aggregates and hash mismatches. Logs show `fingerprintLocations` returns the same string for sorted payloads; unsorted inputs could still cause us to skip updates.
- **Helper RPC fallback**: if helper fails, we silently fall back to the old behaviour. That means the form can load without warehouse filters and without child data. Needs better telemetry if we keep the helper.

# Resolution Summary (2025-11-11 Hotfix)

We chose to repair the Phase 3 branch in place rather than reverting. Fixes landed on `feat/stock-adjustments-phase3-hotfix` and cover all three regressions plus edge-case telemetry.

## Fixes Applied

| Area | Details |
| --- | --- |
| SSR defaults | `page.tsx` now always prefers `preloadedLocations` from `fn_stock_adjustment_load_edit` when `multi_location` is set. RPC failures emit structured dev warnings so we can track fallback usage. |
| Toggle seeding | `multi-location-toggle.tsx` seeds location rows from the aggregated `location/qty` fields the first time multi-mode is enabled, ensuring the breakdown array is never empty. |
| Submission guard | New helpers in `utils/location-helpers.ts` normalise, fingerprint, and (if needed) derive rows from the aggregate values. Saving in multi-mode without rows now surfaces a validation error before any network calls. |
| Edge cases | Fingerprints are order-insensitive, multi→single edits clear child rows, and RPC telemetry warns when data mismatches occur. |

## Automated Coverage

New Playwright @smoke suite (`tests/e2e/stock-adjustments-edit.spec.ts`) and Vitest unit spec (`src/tests/unit/forms/stock-adjustments/location-helpers.spec.ts`) cover:

- Loading an existing multi-location entry.
- Single → multi conversion and persistence.
- Multi → single conversion, ensuring child rows are purged.
- No-op multi save (skips redundant PUT).
- Normalisation, fingerprint stability, and toggle seeding logic.

These tests run inside a lightweight Next.js harness page located at `/test-support/stock-adjustments/edit`.

## Manual QA Checklist

- [x] Multi-location entries render their preloaded rows.
- [x] Toggling single → multi seeds at least one row and persists additions.
- [x] Toggling back to single clears breakdown rows and restores single-field inputs.
- [x] Warehouse filter changes still drive `warehouseLocations` options.
- [x] Helper RPC failure surfaces console warning but the form remains usable.

# Follow-up Actions

1. Integrate harness-driven Playwright coverage into CI smoke pipeline once the shared test environment is ready.
2. Backfill observability hooks (e.g., pino logger) for RPC fallbacks in production environments.
3. Schedule a focused load test to ensure the helper RPC handles concurrent edit traffic without lock contention.

# Notes for Incoming Agent

- The branch `feat/performance-low-risk` currently has the breaking commits. You can inspect the exact diffs in:
  - `page.tsx` (lines 44‑158) for SSR changes.
  - `stock-adjustment-form-wrapper.tsx` (lines 68‑420) for the new submission flow.
  - `patch-scd2/route.ts` (lines 118‑146) for API changes.
- The new helper function lives in `supabase/migrations/20251111_add_fn_stock_adjustment_load_edit.sql`.
- Before retrying, ensure the helper is idempotent and the client fields align with what RHF actually publishes.
- Do **not** attempt further SCD2 tweaks without end-to-end tests; the pattern is sensitive to hashdiff mismatches.

Please review and confirm whether we should proceed with the revert after capturing this context.

