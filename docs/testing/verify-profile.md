# CI Verify Profile

## Overview

The CI Verify job is optimized for speed, determinism, and unit-test-only execution. It runs on every PR and push to `main`/`develop` to catch regressions quickly without blocking developers.

## Current Profile

### What Runs (Fast Path)

1. **TypeCheck** (`pnpm typecheck`)
   - TypeScript compilation check
   - Runtime: ~10-30 seconds
   - Flakiness: Low
   - Classification: Type
   - Value: 3 (catches type errors before runtime)

2. **Lint** (`pnpm lint`)
   - ESLint with quick rules only
   - Runtime: ~15-45 seconds (with cache)
   - Flakiness: Low
   - Classification: Lint
   - Value: 2 (catches common code issues)

3. **Unit Tests** (`pnpm test:unit`)
   - Vitest runner with unit tests only
   - Runtime: ~30-90 seconds
   - Flakiness: Low (deterministic, no network/DB)
   - Classification: Unit
   - Value: 3 (catches logic regressions)

### What Doesn't Run (Moved to Nightly)

- **Build** - Removed (typecheck is sufficient)
- **Health Check** - Removed (requires app startup, flaky)
- **Integration Tests** - Moved to nightly job
- **E2E Tests** - Moved to nightly job
- **Performance Tests** - Moved to nightly job

## Test Globs

### Included (Unit Tests Only)

- `src/**/*.spec.ts`
- `src/**/*.spec.tsx`
- `tests/unit/**/*.spec.ts`
- `tests/unit/**/*.spec.tsx`

### Excluded (Nightly/Integration)

- `**/*.integration.spec.ts`
- `**/*.e2e.spec.ts`
- `**/*.slow.spec.ts`
- `src/tests/integration/**`
- `src/tests/performance/**`
- `tests/integration/**`
- `tests/e2e/**`
- `tests/performance/**`
- `src/app/**/**.e2e.spec.ts`

## Commands

```bash
# Run the full verify profile
pnpm ci:verify

# Individual steps
pnpm typecheck
pnpm lint
pnpm test:unit
```

## Target Performance

- **Total Runtime**: ≤2-3 minutes on CI
- **Flakiness**: 0 failures in 10 consecutive runs
- **Coverage**: ≥80% lines for `src/lib/api/**` and `src/lib/http/**`

## Configuration

### Vitest Config (`vitest.config.ts`)

```typescript
export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    exclude: [
      "src/**/*.integration.spec.ts",
      "src/tests/integration/**",
      "src/tests/performance/**",
      "src/app/**/**.e2e.spec.ts",
    ],
  },
});
```

### CI Script (`scripts/ci-verify.mjs`)

The verify script runs:
1. TypeCheck
2. Lint
3. Unit Tests

No build or health check steps.

## Rationale

- **Fast feedback**: Developers get results in <3 minutes
- **Deterministic**: No flaky network/DB/timeouts
- **High signal**: Catches logic regressions without noise
- **Unit-first**: Tests pure logic that's easy to maintain

## Nightly Tests

Integration, E2E, and performance tests run in a separate nightly job (see `vitest.nightly.config.ts`).















