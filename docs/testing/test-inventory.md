# Test File Inventory

Complete inventory of all test files with classification and recommendations.

## Classification Legend

- **Keep (Unit)**: Fast, deterministic unit tests for verify job
- **Quarantine (Nightly)**: Integration/E2E/performance tests moved to nightly
- **Delete**: Redundant/duplicate tests to remove

## Unit Tests (Keep in Verify)

### Core Library Tests

| File | Location | Classification | Notes |
|------|----------|----------------|-------|
| `list-params.spec.ts` | `src/lib/http/` | Unit | Pure function, fast |
| `normalize-list-payload.spec.ts` | `src/lib/http/__tests__/` | Unit | Pure function, fast |
| `parseListParams.spec.ts` | `src/lib/next/__tests__/` | Unit | Pure function, fast |
| `handle-list.spec.ts` | `src/lib/api/` | Unit | Unit test with mocks, fast |
| `resolve-resource.spec.ts` | `src/lib/api/` | Unit | Unit test with mocks, fast |
| `resolve-resource.all-resources.spec.ts` | `src/lib/api/` | Unit | Registry validation, fast |
| `route.spec.ts` | `src/app/api/[resource]/` | Unit | Route delegator test, fast |
| `route.all-resources.spec.ts` | `src/app/api/[resource]/` | Unit | All resources smoke test |

### Data & Resources Tests

| File | Location | Classification | Notes |
|------|----------|----------------|-------|
| `config.guard.spec.ts` | `src/lib/data/resources/` | Unit | Config validation |
| `all-resources.config.spec.ts` | `src/lib/data/resources/` | Unit | Registry completeness |
| `v_tcm_user_tally_card_entries.scoping.spec.ts` | `src/lib/data/resources/__tests__/` | Unit | Scoping logic |

### Component Tests

| File | Location | Classification | Notes |
|------|----------|----------------|-------|
| `table-utils.spec.ts` | `src/components/data-table/__tests__/` | Unit | Pure utils |
| `queryKey.spec.ts` | `src/components/forms/resource-view/__tests__/` | Unit | Query key generation |
| `getRowId.spec.ts` | `src/components/forms/resource-view/__tests__/` | Unit | Row ID extraction |
| `enhanced-loader.spec.tsx` | `src/components/ui/__tests__/` | Unit | Component test |
| `background-loader.spec.tsx` | `src/components/ui/__tests__/` | Unit | Component test |
| `page-shell-with-loading.spec.tsx` | `src/components/forms/shell/__tests__/` | Unit | Component test |
| `form-shell-with-loading.spec.tsx` | `src/components/forms/shell/__tests__/` | Unit | Component test |
| `form-island-loading.spec.tsx` | `src/components/forms/shell/__tests__/` | Unit | Component test |
| `resource-form-ssr-page-loading.spec.tsx` | `src/components/forms/form-view/__tests__/` | Unit | Component test |

### App Tests

| File | Location | Classification | Notes |
|------|----------|----------------|-------|
| `auth-middleware.spec.ts` | `src/app/auth/__tests__/` | Unit | Auth middleware logic |
| `auth-routing.spec.tsx` | `src/app/auth/__tests__/` | Unit | Routing logic |
| `auth-layout.spec.tsx` | `src/app/auth/__tests__/` | Unit | Layout logic |
| `to-row.spec.ts` | `src/app/(main)/forms/stock-adjustments/__tests__/` | Unit | Transformation logic |
| `filters.spec.ts` | `src/app/(main)/forms/stock-adjustments/__tests__/` | Unit | Filter logic |
| `columns.spec.ts` | `src/app/(main)/forms/stock-adjustments/__tests__/` | Unit | Column config |

### Dedicated Unit Test Directory

All tests in `tests/unit/**` are kept (unit tests only).

## Integration Tests (Move to Nightly)

| File | Location | Classification | Notes |
|------|----------|----------------|-------|
| `handle-list.integration.spec.ts` | `src/lib/api/` | Integration | Tests with real mocks |
| `pagination.integration.spec.ts` | `src/lib/api/` | Integration | Pagination E2E |
| `route.integration.spec.ts` | `src/app/api/[resource]/` | Integration | API route integration |
| `build-verification.spec.ts` | `src/tests/integration/` | Integration | Build verification |
| `simple-build-verification.spec.ts` | `src/tests/integration/` | Integration | Simple build check |
| `end-to-end-build.spec.ts` | `src/tests/integration/` | Integration | E2E build |
| `performance-build.spec.ts` | `src/tests/integration/` | Integration | Performance build |
| `api.spec.ts` | `src/tests/integration/forms/stock-adjustments/` | Integration | Form API integration |
| All in `tests/integration/**` | | Integration | All integration tests |

## E2E Tests (Move to Nightly)

| File | Location | Classification | Notes |
|------|----------|----------------|-------|
| `route.tally_cards.e2e.spec.ts` | `src/app/api/[resource]/` | E2E | E2E API test |
| `smoke.spec.ts` | `tests/e2e/` | E2E | Smoke tests |
| `stock-adjustments-user-workflows.spec.ts` | `tests/e2e/` | E2E | User workflows |
| `stock-adjustments.spec.ts` | `tests/e2e/` | E2E | Stock adjustments E2E |
| `stock-adjustments-loading.spec.ts` | `tests/e2e/forms/` | E2E | Loading states |
| `stock-adjustments-form-loading.spec.ts` | `tests/e2e/forms/` | E2E | Form loading |
| `dashboard.spec.ts` | `tests/e2e/` | E2E | Dashboard E2E |
| `auth-improvements.spec.ts` | `tests/e2e/` | E2E | Auth improvements |
| `integration.spec.tsx` | `tests/e2e/auth/` | E2E | Auth integration |
| All in `tests/e2e/**` | | E2E | All Playwright E2E tests |

## Performance Tests (Move to Nightly)

| File | Location | Classification | Notes |
|------|----------|----------------|-------|
| `performance-monitoring.spec.tsx` | `src/tests/performance/` | Performance | Performance monitoring |
| All in `tests/performance/**` | | Performance | All performance tests |

## Redundant Tests (Delete)

### Duplicates Between `src/` and `tests/unit/`

These pairs are duplicates - keep the one in `src/` (co-located):

| Source Location | Duplicate Location | Action |
|----------------|-------------------|--------|
| `src/lib/http/list-params.spec.ts` | `tests/unit/lib/http/list-params.spec.ts` | Delete duplicate |
| `src/lib/next/__tests__/parseListParams.spec.ts` | `tests/unit/lib/next/parseListParams.spec.ts` | Delete duplicate |
| `src/lib/api/handle-list.spec.ts` | `tests/unit/lib/api/handle-list.spec.ts` | Delete duplicate |
| `src/lib/api/resolve-resource.spec.ts` | `tests/unit/lib/api/resolve-resource.spec.ts` | Delete duplicate |
| `src/lib/api/resolve-resource.all-resources.spec.ts` | `tests/unit/lib/api/resolve-resource.all-resources.spec.ts` | Delete duplicate |
| `src/lib/data/resources/config.guard.spec.ts` | `tests/unit/lib/data/resources/config.guard.spec.ts` | Delete duplicate |
| `src/lib/data/resources/all-resources.config.spec.ts` | `tests/unit/lib/data/resources/all-resources.config.spec.ts` | Delete duplicate |
| `src/lib/data/resources/__tests__/v_tcm_user_tally_card_entries.scoping.spec.ts` | `tests/unit/lib/data/resources/v_tcm_user_tally_card_entries.scoping.spec.ts` | Delete duplicate |
| `src/lib/http/__tests__/normalize-list-payload.spec.ts` | `tests/unit/lib/http/normalize-list-payload.spec.ts` | Delete duplicate |
| `src/components/data-table/__tests__/table-utils.spec.ts` | `tests/unit/components/data-table/table-utils.spec.ts` | Delete duplicate |
| `src/components/forms/resource-view/__tests__/queryKey.spec.ts` | `tests/unit/components/forms/resource-view/queryKey.spec.ts` | Delete duplicate |
| `src/components/forms/resource-view/__tests__/getRowId.spec.ts` | `tests/unit/components/forms/resource-view/getRowId.spec.ts` | Delete duplicate |
| `src/app/auth/__tests__/auth-middleware.spec.ts` | `tests/unit/app/auth/auth-middleware.spec.ts` | Delete duplicate |
| `src/app/(main)/forms/stock-adjustments/__tests__/to-row.spec.ts` | `tests/unit/app/forms/stock-adjustments/to-row.spec.ts` | Delete duplicate |
| `src/app/(main)/forms/stock-adjustments/__tests__/filters.spec.ts` | `tests/unit/app/forms/stock-adjustments/filters.spec.ts` | Delete duplicate |
| `src/app/(main)/forms/stock-adjustments/__tests__/columns.spec.ts` | `tests/unit/app/forms/stock-adjustments/columns.spec.ts` | Delete duplicate |

### `.test.ts` Duplicates of `.spec.ts`

These `.test.ts` files duplicate `.spec.ts` files - delete the `.test.ts` versions:

| File | Location | Action |
|------|----------|--------|
| `auth-middleware.test.ts` | `src/app/auth/__tests__/` | Delete (duplicate of `.spec.ts`) |
| `auth-routing.test.tsx` | `src/app/auth/__tests__/` | Delete (duplicate of `.spec.tsx`) |
| `auth-layout.test.tsx` | `src/app/auth/__tests__/` | Delete (duplicate of `.spec.tsx`) |
| `column-resize.test.tsx` | `src/components/data-table/__tests__/` | Delete (duplicate of `.spec.tsx` if exists) |
| All `.test.ts`/`.test.tsx` in `tests/unit/**` | | Delete (duplicates of `.spec.ts` files) |

## Summary

- **Unit Tests (Keep)**: ~45 files
- **Integration Tests (Nightly)**: ~10 files
- **E2E Tests (Nightly)**: ~10 files
- **Performance Tests (Nightly)**: ~2 files
- **Redundant Tests (Delete)**: ~30 files

## Recommendations

1. **Consolidate test locations**: Prefer co-located `src/**/*.spec.ts` over `tests/unit/**`
2. **Remove duplicates**: Delete duplicate tests between `src/` and `tests/unit/`
3. **Remove `.test.ts` files**: Delete `.test.ts` duplicates of `.spec.ts` files
4. **Move to nightly**: All integration/e2e/performance tests should run in nightly job





