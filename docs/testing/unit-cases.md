# Missing Unit Test Cases

High-leverage unit tests to add for core pure logic modules. These tests catch regressions we've actually seen in production.

## Priority 1: Core Pure Logic (Must Have)

### 1. `src/lib/http/list-params.ts` - Multi-value Query Keys

**Target**: `parseListQuery` function  
**Why**: We've hit fragility with multi-value params and URL encoding.

**Test Cases**:
```typescript
describe("parseListQuery multi-value handling", () => {
  it("handles single filter value", () => {
    const url = new URL("http://x.local/api?filters[status][value]=ACTIVE");
    const result = parseListQuery(url);
    // Assert: searchParams accessible, filters parseable
  });

  it("handles multiple values for same key", () => {
    const url = new URL("http://x.local/api?status=A&status=B");
    const result = parseListQuery(url);
    // Assert: searchParams.getAll('status') works
  });

  it("handles structured filters", () => {
    const url = new URL("http://x.local/api?filters[warehouse][value]=WH1&filters[warehouse][mode]=eq");
    const result = parseListQuery(url);
    // Assert: structured filter parsing
  });

  it("handles URL encoding", () => {
    const url = new URL("http://x.local/api?q=hello%20world");
    const result = parseListQuery(url);
    expect(result.q).toBe("hello world");
  });

  it("handles empty/undefined/null gracefully", () => {
    const url = new URL("http://x.local/api");
    const result = parseListQuery(url);
    expect(result.q).toBeUndefined();
    expect(result.page).toBe(1);
  });
});
```

**Fixtures**: Minimal URL objects, no mocks needed.

---

### 2. `src/lib/http/list-params.ts` - Helper Functions

**Target**: `toBool`, `toClampedInt`  
**Why**: Coercion edge cases cause subtle bugs.

**Test Cases**:
```typescript
describe("toBool", () => {
  it.each([
    ["1", true],
    ["true", true],
    ["yes", true],
    ["0", false],
    ["false", false],
    ["no", false],
    ["", false],
    [null, false],
    [undefined, false],
  ])("coerces %s to %s", (input, expected) => {
    expect(toBool(input)).toBe(expected);
  });
});

describe("toClampedInt", () => {
  it("clamps to min", () => {
    expect(toClampedInt("-10", { def: 1, min: 1, max: 100 })).toBe(1);
  });

  it("clamps to max", () => {
    expect(toClampedInt("999", { def: 1, min: 1, max: 100 })).toBe(100);
  });

  it("handles NaN", () => {
    expect(toClampedInt("abc", { def: 50, min: 1, max: 100 })).toBe(50);
  });

  it("handles null/undefined", () => {
    expect(toClampedInt(null, { def: 50, min: 1, max: 100 })).toBe(50);
  });
});
```

---

### 3. `src/lib/api/handle-list.ts` - Pagination Window & Response Contract

**Target**: Pagination math and `{ rows, total }` shape  
**Why**: Page drift (1-based vs 0-based) causes off-by-one errors.

**Test Cases**:
```typescript
describe("listHandler pagination", () => {
  it("calculates page 1 correctly (offset 0)", async () => {
    const mockProvider = {
      list: vi.fn(async ({ page, pageSize }) => {
        expect(page).toBe(1);
        // Assert: offset = (page - 1) * pageSize = 0
        return { rows: [], total: 0 };
      }),
    };
    // Test with page=1, pageSize=50
  });

  it("calculates page N correctly (offset (N-1)*pageSize)", async () => {
    // Test with page=3, pageSize=50
    // Assert: offset = (3-1) * 50 = 100
  });

  it("returns correct { rows, total } shape", async () => {
    const res = await listHandler(req, "resource");
    const body = await res.json();
    expect(body).toHaveProperty("rows");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page");
    expect(body).toHaveProperty("pageSize");
  });

  it("handles empty results", async () => {
    // Assert: total=0, rows=[]
  });

  it("handles total > rows.length (last page)", async () => {
    // Assert: total=100, rows.length=25 (last page of 4)
  });
});
```

---

### 4. `src/lib/api/handle-list.ts` - Filter Extraction

**Target**: Filter parsing from URLSearchParams  
**Why**: Structured filters and numeric comparisons are complex.

**Test Cases**:
```typescript
describe("listHandler filter extraction", () => {
  it("parses structured filters", async () => {
    const url = "http://x.local/api?filters[warehouse][value]=WH1&filters[warehouse][mode]=eq";
    const req = new Request(url);
    // Assert: filters.warehouse = { value: "WH1", mode: "eq" }
  });

  it("parses numeric comparison filters", async () => {
    const url = "http://x.local/api?qty_gt=10&qty_lte=100";
    const req = new Request(url);
    // Assert: filters.qty_gt = 10, filters.qty_lte = 100
  });

  it("ignores non-finite numeric values", async () => {
    const url = "http://x.local/api?qty_gt=abc";
    // Assert: filters.qty_gt is not set
  });

  it("parses custom filters", async () => {
    const url = "http://x.local/api?customFilter=value";
    // Assert: filters.customFilter = "value"
  });
});
```

---

### 5. `src/lib/api/resolve-resource.ts` - Registry Lookups

**Target**: `resolveResource` function  
**Why**: Registry resolution logic is critical for all API routes.

**Test Cases**:
```typescript
describe("resolveResource", () => {
  it("resolves plain config", async () => {
    // Mock registry with plain ResourceConfig
    const result = await resolveResource("key");
    expect(result.config).toBeDefined();
    expect(result.toRow).toBeUndefined();
    expect(result.allowRaw).toBe(true);
  });

  it("resolves entry-object with projection", async () => {
    // Mock registry with { config, toRow, allowRaw }
    const result = await resolveResource("key");
    expect(result.toRow).toBeDefined();
    expect(result.allowRaw).toBe(false); // if set
  });

  it("throws for invalid key", async () => {
    await expect(resolveResource("invalid")).rejects.toThrow("Unknown resource");
  });

  it("throws for missing table/select", async () => {
    // Mock registry with invalid config
    await expect(resolveResource("key")).rejects.toThrow("invalid config");
  });
});
```

---

### 6. `src/lib/api/scope.ts` - Warehouse/Role Scoping Rules

**Target**: `applyWarehouseScopeToSupabase`, `applyOwnershipScopeToSupabase`  
**Why**: Scoping logic is security-critical and has complex edge cases.

**Test Cases**:
```typescript
describe("applyWarehouseScopeToSupabase", () => {
  it("bypasses when mode is 'none'", () => {
    const qb = { in: vi.fn(), eq: vi.fn() };
    const result = applyWarehouseScopeToSupabase(qb, { mode: "none" }, ctx);
    expect(qb.in).not.toHaveBeenCalled();
  });

  it("bypasses when canSeeAllWarehouses=true and requireBinding=false", () => {
    const ctx = { canSeeAllWarehouses: true, allowedWarehouses: [] };
    const cfg = { mode: "column", column: "warehouse" };
    // Assert: no filter applied
  });

  it("applies filter when canSeeAllWarehouses=false", () => {
    const qb = { in: vi.fn().mockReturnThis() };
    const ctx = { canSeeAllWarehouses: false, allowedWarehouses: ["WH1", "WH2"] };
    const cfg = { mode: "column", column: "warehouse" };
    applyWarehouseScopeToSupabase(qb, cfg, ctx);
    expect(qb.in).toHaveBeenCalledWith("warehouse", ["WH1", "WH2"]);
  });

  it("uses IDs when column ends with _id", () => {
    const ctx = {
      canSeeAllWarehouses: false,
      allowedWarehouseIds: ["uuid1", "uuid2"],
      allowedWarehouseCodes: ["WH1"],
    };
    const cfg = { mode: "column", column: "warehouse_id" };
    // Assert: uses allowedWarehouseIds
  });

  it("returns empty filter when no bindings", () => {
    const ctx = { canSeeAllWarehouses: false, allowedWarehouses: [] };
    const cfg = { mode: "column", column: "warehouse" };
    // Assert: in(column, ["__NO_ALLOWED_WAREHOUSES__"])
  });

  it("respects requireBinding flag", () => {
    const ctx = { canSeeAllWarehouses: true };
    const cfg = { mode: "column", column: "warehouse", requireBinding: true };
    // Assert: filter applied even with canSeeAllWarehouses
  });
});

describe("applyOwnershipScopeToSupabase", () => {
  it("bypasses when mode is not 'self'", () => {
    // Assert: no filter
  });

  it("bypasses when bypass permission present", () => {
    const ctx = { userId: "user1", permissions: ["admin:read:any"] };
    const cfg = { mode: "self", column: "user_id", bypassPermissions: ["admin:read:any"] };
    // Assert: no filter
  });

  it("applies filter when no bypass", () => {
    const qb = { eq: vi.fn().mockReturnThis() };
    const ctx = { userId: "user1", permissions: [] };
    const cfg = { mode: "self", column: "user_id" };
    applyOwnershipScopeToSupabase(qb, cfg, ctx);
    expect(qb.eq).toHaveBeenCalledWith("user_id", "user1");
  });
});
```

---

### 7. `src/lib/api/scope-guards.ts` - Row-level Scope Assertions

**Target**: `assertRowInWarehouseScope`, `assertRowInOwnershipScope`  
**Why**: Row-level checks are security-critical.

**Test Cases**:
```typescript
describe("assertRowInWarehouseScope", () => {
  it("passes when row is in scope", () => {
    const row = { warehouse: "WH1" };
    const ctx = { canSeeAllWarehouses: false, allowedWarehouses: ["WH1"] };
    const cfg = { mode: "column", column: "warehouse" };
    expect(() => assertRowInWarehouseScope(row, cfg, ctx)).not.toThrow();
  });

  it("throws 403 when row is out of scope", () => {
    const row = { warehouse: "WH2" };
    const ctx = { canSeeAllWarehouses: false, allowedWarehouses: ["WH1"] };
    const cfg = { mode: "column", column: "warehouse" };
    expect(() => assertRowInWarehouseScope(row, cfg, ctx)).toThrow("forbidden_out_of_scope_warehouse");
  });

  it("bypasses when canSeeAllWarehouses=true", () => {
    const row = { warehouse: "WH2" };
    const ctx = { canSeeAllWarehouses: true, allowedWarehouses: [] };
    expect(() => assertRowInWarehouseScope(row, cfg, ctx)).not.toThrow();
  });
});

describe("assertRowInOwnershipScope", () => {
  it("throws 403 when owner mismatch", () => {
    const row = { user_id: "user2" };
    const ctx = { userId: "user1", permissions: [] };
    const cfg = { mode: "self", column: "user_id" };
    expect(() => assertRowInOwnershipScope(row, cfg, ctx)).toThrow("forbidden_out_of_scope_owner");
  });

  it("bypasses when bypass permission present", () => {
    const row = { user_id: "user2" };
    const ctx = { userId: "user1", permissions: ["admin:read:any"] };
    const cfg = { mode: "self", column: "user_id", bypassPermissions: ["admin:read:any"] };
    expect(() => assertRowInOwnershipScope(row, cfg, ctx)).not.toThrow();
  });
});
```

---

### 8. `src/lib/data/projects.ts` - Projection Mapping

**Target**: `projectRows` function  
**Why**: Projection ensures only whitelisted fields are returned.

**Test Cases**:
```typescript
describe("projectRows", () => {
  it("maps by key", () => {
    const rows = [{ id: "1", name: "A", extra: "ignored" }];
    const spec = { id: "id", name: "name" };
    const result = projectRows(rows, spec);
    expect(result).toEqual([{ id: "1", name: "A" }]);
    expect(result[0]).not.toHaveProperty("extra");
  });

  it("maps by function", () => {
    const rows = [{ id: "1", qty: 10 }];
    const spec = { qtyString: (r: any) => String(r.qty) };
    const result = projectRows(rows, spec);
    expect(result).toEqual([{ qtyString: "10" }]);
  });

  it("handles mixed mapping", () => {
    const rows = [{ id: "1", qty: 10 }];
    const spec = { id: "id", qtyString: (r: any) => String(r.qty) };
    const result = projectRows(rows, spec);
    expect(result).toEqual([{ id: "1", qtyString: "10" }]);
  });

  it("handles empty rows", () => {
    expect(projectRows([], { id: "id" })).toEqual([]);
  });
});
```

---

### 9. `src/lib/next/search-params.ts` - SSR-safe Param Parsing

**Target**: `parseListParams`, `parsePagination`, `parsePositiveInt`  
**Why**: Next.js 15 SSR params are Promise-based, need unwrapping.

**Test Cases**:
```typescript
describe("parseListParams", () => {
  it("handles Promise<SPRecord>", async () => {
    const sp = Promise.resolve({ page: "2" });
    const result = await parseListParams(sp, []);
    expect(result.page).toBe(2);
  });

  it("handles array values (takes first)", () => {
    const sp = { status: ["ACTIVE", "INACTIVE"] };
    const filterMeta = [{ id: "status" }];
    const result = parseListParams(sp, filterMeta);
    expect(result.filters.status).toBe("ACTIVE");
  });

  it("clamps page to minimum", () => {
    const sp = { page: "0" };
    const result = parseListParams(sp, [], { defaultPage: 1 });
    expect(result.page).toBe(1);
  });

  it("clamps pageSize to maximum", () => {
    const sp = { pageSize: "1000" };
    const result = parseListParams(sp, [], { max: 500 });
    expect(result.pageSize).toBe(500);
  });
});
```

---

### 10. `src/components/data-table/use-column-resize.ts` - Width Math

**Target**: Extract pure function for width clamping  
**Why**: Width calculations need deterministic testing.

**Test Cases**:
```typescript
// Extract pure function: clampColumnWidth(width, minPx, maxPx, meta)
describe("clampColumnWidth", () => {
  it("clamps below min", () => {
    expect(clampColumnWidth(50, 80, 800, null)).toBe(80);
  });

  it("clamps above max", () => {
    expect(clampColumnWidth(1000, 80, 800, null)).toBe(800);
  });

  it("uses meta overrides", () => {
    const meta = { minPx: 100, maxPx: 600 };
    expect(clampColumnWidth(50, 80, 800, meta)).toBe(100);
    expect(clampColumnWidth(1000, 80, 800, meta)).toBe(600);
  });

  it("returns value within range", () => {
    expect(clampColumnWidth(200, 80, 800, null)).toBe(200);
  });
});
```

---

## Priority 2: Supporting Logic

### 11. URL Parameter Edge Cases

**Target**: `parseListQuery` with complex URLSearchParams  
**Test Cases**: Duplicate keys, structured filters, URL encoding (covered in #1)

### 12. Pagination Drift

**Target**: Page index calculations  
**Test Cases**: Covered in #3

### 13. Selection Persistence

**Target**: Query key generation  
**File**: `src/components/forms/resource-view/__tests__/queryKey.spec.ts` (already exists)  
**Action**: Verify completeness, add edge cases if missing

---

## Implementation Notes

1. **Use table-driven tests** where possible (`it.each`)
2. **Minimal fixtures**: Plain objects, no DB/network
3. **No timers/sleeps**: All tests should be <100ms
4. **Pure functions only**: Extract testable logic from hooks/components
5. **Deterministic**: No random data, use fixed fixtures

## Coverage Targets

- `src/lib/api/**`: ≥80% lines
- `src/lib/http/**`: ≥80% lines
- `src/lib/next/search-params.ts`: ≥80% lines
- `src/lib/data/projects.ts`: ≥80% lines






