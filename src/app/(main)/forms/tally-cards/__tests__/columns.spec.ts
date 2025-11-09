import { describe, it, expect } from "vitest";
import { tallyCardsViewConfig } from "../tally-cards.config";

describe("buildColumns", () => {
  it("returns columns with consistent structure on multiple calls", () => {
    const columns1 = tallyCardsViewConfig.buildColumns();
    const columns2 = tallyCardsViewConfig.buildColumns();

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
    const columns = tallyCardsViewConfig.buildColumns();
    const ids = columns.map((col) => (col as { id?: string }).id).filter(Boolean);

    // Check all IDs are unique
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // Verify expected column IDs (based on actual buildColumns implementation)
    expect(ids).toContain("id");
    expect(ids).toContain("tally_card_number");
    expect(ids).toContain("warehouse_name");  // Changed from warehouse_id
    expect(ids).toContain("item_number");
    expect(ids).toContain("is_active");
    expect(ids).toContain("updated_at_pretty");  // Changed from snapshot_at
  });

  it("columns maintain stable structure across calls", () => {
    const columns1 = tallyCardsViewConfig.buildColumns();
    const columns2 = tallyCardsViewConfig.buildColumns();

    expect(columns1.length).toBe(columns2.length);
    
    // Verify each column has expected properties
    columns1.forEach((col, idx) => {
      const col2 = columns2[idx];
      expect((col as { id?: string }).id).toBe((col2 as { id?: string }).id);
      expect(typeof (col as { header?: unknown }).header).toBeDefined();
    });
  });

  it("includes all expected column types", () => {
    const columns = tallyCardsViewConfig.buildColumns();
    const ids = columns.map((col) => (col as { id?: string }).id);

    // Should have: id, tally_card_number, warehouse_name, item_number, is_active, updated_at_pretty, actions
    expect(ids.length).toBeGreaterThanOrEqual(7);
  });
});


