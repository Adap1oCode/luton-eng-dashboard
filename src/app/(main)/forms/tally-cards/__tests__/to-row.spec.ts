import { describe, it, expect } from "vitest";
import { toRow } from "../to-row";

describe("toRow", () => {
  it("transforms complete API response to TallyCardRow", () => {
    const apiData = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      card_uid: "987e6543-e21b-43d2-b654-426614174111",
      warehouse_id: "456e7890-e12b-34d5-c678-426614174222",
      tally_card_number: "TC-123",
      item_number: 12345,
      note: "Test note",
      is_active: true,
      created_at: "2024-01-15T10:30:00Z",
      snapshot_at: "2024-01-15T10:30:00Z",
    };

    const result = toRow(apiData);

    expect(result).toEqual({
      id: "123e4567-e89b-12d3-a456-426614174000",
      card_uid: "987e6543-e21b-43d2-b654-426614174111",
      warehouse_id: "456e7890-e12b-34d5-c678-426614174222",
      warehouse_name: null,
      tally_card_number: "TC-123",
      item_number: 12345,
      note: "Test note",
      is_active: true,
      created_at: "2024-01-15T10:30:00Z",
      snapshot_at: "2024-01-15T10:30:00Z",
      updated_at: null,
      updated_at_pretty: null,
    });
  });

  it("coerces id to String type", () => {
    const apiData = {
      id: 12345,
      card_uid: null,
      warehouse_id: null,
    };

    const result = toRow(apiData);

    expect(result.id).toBe("12345");
    expect(result.card_uid).toBeNull();
    expect(result.warehouse_id).toBeNull();
  });

  it("handles null/undefined for optional fields", () => {
    const apiData = {
      id: "123",
      card_uid: null,
      warehouse_id: null,
      tally_card_number: null,
      item_number: null,
      note: null,
      is_active: null,
      created_at: null,
      snapshot_at: null,
    };

    const result = toRow(apiData);

    expect(result.tally_card_number).toBeNull();
    expect(result.item_number).toBeNull();
    expect(result.note).toBeNull();
    expect(result.is_active).toBeNull();
    expect(result.created_at).toBeNull();
    expect(result.snapshot_at).toBeNull();
  });

  it("converts item_number to number correctly", () => {
    const apiData1 = { id: "1", item_number: "12345" };
    const apiData2 = { id: "2", item_number: 67890 };
    const apiData3 = { id: "3", item_number: null };

    expect(toRow(apiData1).item_number).toBe(12345);
    expect(toRow(apiData2).item_number).toBe(67890);
    expect(toRow(apiData3).item_number).toBeNull();
  });

  it("handles missing or undefined input gracefully", () => {
    const result = toRow(undefined);

    expect(result).toEqual({
      id: "",
      card_uid: null,
      warehouse_id: null,
      warehouse_name: null,
      tally_card_number: null,
      item_number: null,
      note: null,
      is_active: null,
      created_at: null,
      snapshot_at: null,
      updated_at: null,
      updated_at_pretty: null,
    });
  });

  it("preserves type consistency across multiple calls", () => {
    const apiData = {
      id: "123",
      item_number: 12345,
      is_active: true,
    };

    const result1 = toRow(apiData);
    const result2 = toRow(apiData);

    expect(result1).toEqual(result2);
    expect(typeof result1.id).toBe("string");
    expect(typeof result1.item_number).toBe("number");
    expect(typeof result1.is_active).toBe("boolean");
  });
});









