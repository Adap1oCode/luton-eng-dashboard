# Auto-Fix Vercel Build Run — 2025-11-10

## Vercel Context
- **Team / Project:** Unable to determine. `npx vercel teams ls` required credentials and no MCP resources were available despite the docs reference. Awaiting access details.
- **Latest failing deployment:** Not collected. Capture of deployment metadata blocked by missing Vercel credentials/MCP hooks.
- **Build log status:** `reports/vercel-fix-run/logs/vercel-deploy-unavailable.log` documents the access failure. No remote log excerpts were available.

## Local Reproduction
- `npm ci && npm run build`
  - Initial failure: `Property 'apiEndpoint' does not exist on type 'BaseViewConfig<InventoryCurrentRow>'.`
  - Subsequent type-check surface: missing `id` field support for new resource tables, outdated form props, and invalid schema metadata (`double`, `numeric`, `date`).
- Follow-up builds performed after each fix confirmed the same errors were resolved; final run succeeded. See `reports/vercel-fix-run/logs/local-build.log` for the successful build transcript.

## Code Changes
- `src/app/(main)/forms/inventory-current/*`
  - Added stable `id` to row shape with deterministic fallbacks and moved `idField` to `"id"` so `ResourceTableClient` constraints are satisfied. Typed config to expose `apiEndpoint`.
- `src/app/(main)/forms/inventory-unique/*`
  - Mirrored the `id`/`apiEndpoint` fixes for the inventory unique view.
- `src/components/data-table/view-defaults.tsx`
  - Added optional `apiEndpoint` to `BaseViewConfig` so all table clients can access it without casting.
- `src/components/forms/dynamic-field.tsx`
  - Allowed options to carry an optional `value`, fixing type errors when mapping location selects.
- `src/app/(main)/forms/warehouse-locations/new/page.tsx`, `src/app/(main)/forms/warehouses/new/page.tsx`
  - Removed obsolete props from `FormIsland`; transport metadata already lives inside the config object.
- `src/lib/data/resources/v_inventory_current.config.ts`
  - Normalized schema field types to the supported union (`number`, `int`, `timestamp`) to satisfy the shared metadata layer.
- `.gitignore`, `scripts/build-like-vercel.sh`
  - Allowed `.sh` scripts under `scripts/` to be tracked and added the requested build helper that mirrors Vercel’s install/build sequence.

## Result
- **Local build:** ✅ `npm run build`
- **Report artifacts:**
  - Remote logs: `reports/vercel-fix-run/logs/vercel-deploy-unavailable.log`
  - Local build: `reports/vercel-fix-run/logs/local-build.log`
  - Patch bundle: `patches/0001-vercel-build-fix.patch`

## Next Steps
1. Provide Vercel MCP credentials or token so the automation can pull team/project metadata and attach the failing deployment log.
2. Run `npm run lint`, `npm run test`, and the full `pnpm ci:verify` suite once broader verification is in scope.
3. Coordinate with the Vercel project maintainers to confirm a new deployment after merging these type fixes.
4. Keep an eye on other resource configs for `double/numeric/date` metadata — the shared union may need formal extension if future views depend on richer typing.
