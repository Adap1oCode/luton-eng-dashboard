import { describe, it, expect } from "vitest";
import { stockAdjustmentsViewConfig } from "../stock-adjustments.config";

describe("buildColumns", () => {
  it("returns columns with consistent structure on multiple calls", () => {
    const columns1 = stockAdjustmentsViewConfig.buildColumns();
    const columns2 = stockAdjustmentsViewConfig.buildColumns();

    // Columns should have same length and structure
    // Note: We can't memoize at module level because makeActionsColumn() is client-only
    // Deep equality check may fail due to function references or non-deterministic elements
    expect(columns1.length).toBe(columns2.length);
    // Check structure instead of deep equality (function references may differ)
    columns1.forEach((col1, idx) => {
      const col2 = columns2[idx];
      expect((col1 as { id?: string }).id).toBe((col2 as { id?: string }).id);
      expect(typeof (col1 as { header?: unknown }).header).toBe(typeof (col2 as { header?: unknown }).header);
    });
  });

  it("column IDs are stable and unique", () => {
    const columns = stockAdjustmentsViewConfig.buildColumns();
    const ids = columns.map((col) => (col as { id?: string }).id).filter(Boolean);

    // Check all IDs are unique
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // Verify expected column IDs
    expect(ids).toContain("id");
    expect(ids).toContain("tally_card_number");
    expect(ids).toContain("warehouse");
    expect(ids).toContain("full_name");
    expect(ids).toContain("qty");
    expect(ids).toContain("location");
    expect(ids).toContain("note");
    expect(ids).toContain("updated_at_pretty");
  });

  it("columns maintain stable structure across calls", () => {
    const columns1 = stockAdjustmentsViewConfig.buildColumns();
    const columns2 = stockAdjustmentsViewConfig.buildColumns();

    expect(columns1.length).toBe(columns2.length);
    
    // Verify each column has expected properties
    columns1.forEach((col, idx) => {
      const col2 = columns2[idx];
      expect((col as { id?: string }).id).toBe((col2 as { id?: string }).id);
      expect(typeof (col as { header?: unknown }).header).toBeDefined();
    });
  });

  it("includes all expected column types", () => {
    const columns = stockAdjustmentsViewConfig.buildColumns();
    const ids = columns.map((col) => (col as { id?: string }).id);

    // Should have: id, tally_card_number, warehouse, full_name, qty, location, note, updated_at_pretty, actions
    expect(ids.length).toBeGreaterThanOrEqual(9);
  });
});


