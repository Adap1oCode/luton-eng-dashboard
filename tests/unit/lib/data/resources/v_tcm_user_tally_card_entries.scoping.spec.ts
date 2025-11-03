import { describe, it, expect } from "vitest";
import tcm_user_tally_card_entries from "../v_tcm_user_tally_card_entries.config";

describe("v_tcm_user_tally_card_entries resource config scoping", () => {
  it("includes user_id in select string (required for ownership scoping)", () => {
    const select = tcm_user_tally_card_entries.select;

    expect(select).toContain("user_id");
  });

  it("includes warehouse_id in select string (required for warehouse scoping)", () => {
    const select = tcm_user_tally_card_entries.select;

    expect(select).toContain("warehouse_id");
  });

  it("has proper ownershipScope configuration", () => {
    const ownershipScope = tcm_user_tally_card_entries.ownershipScope;

    expect(ownershipScope).toBeDefined();
    expect(ownershipScope?.mode).toBe("self");
    expect(ownershipScope?.column).toBe("user_id");
    expect(ownershipScope?.bypassPermissions).toBeDefined();
    expect(Array.isArray(ownershipScope?.bypassPermissions)).toBe(true);
  });

  it("has proper warehouseScope configuration", () => {
    const warehouseScope = tcm_user_tally_card_entries.warehouseScope;

    expect(warehouseScope).toBeDefined();
    expect(warehouseScope?.mode).toBe("column");
    expect(warehouseScope?.column).toBe("warehouse_id");
  });

  it("select string includes all required fields for scoping", () => {
    const select = tcm_user_tally_card_entries.select;

    // Must include both scoping columns
    expect(select).toMatch(/\buser_id\b/);
    expect(select).toMatch(/\bwarehouse_id\b/);
    
    // Also verify other essential fields
    expect(select).toContain("id");
    expect(select).toContain("full_name");
    expect(select).toContain("warehouse"); // Display field
  });

  it("scoping configuration matches select fields", () => {
    const select = tcm_user_tally_card_entries.select;
    const ownershipCol = tcm_user_tally_card_entries.ownershipScope?.column;
    const warehouseCol = tcm_user_tally_card_entries.warehouseScope?.column;

    expect(select).toContain(ownershipCol);
    expect(select).toContain(warehouseCol);
  });
});






