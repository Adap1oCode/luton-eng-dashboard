import { describe, it, expect } from "vitest";
import { toRow } from "../to-row";

describe("toRow", () => {
  it("transforms complete API response to StockAdjustmentRow", () => {
    const apiData = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      full_name: "John Doe",
      warehouse: "WH-001",
      tally_card_number: "TC-123",
      item_number: 12345,
      qty: 10,
      location: "A1-B2",
      note: "Test note",
      updated_at: "2024-01-15T10:30:00Z",
      updated_at_pretty: "Jan 15, 2024",
    };

    const result = toRow(apiData);

    expect(result).toEqual({
      id: "123e4567-e89b-12d3-a456-426614174000",
      full_name: "John Doe",
      warehouse: "WH-001",
      tally_card_number: "TC-123",
      item_number: 12345,
      qty: 10,
      location: "A1-B2",
      note: "Test note",
      reason_code: null,
      multi_location: null,
      updated_at: "2024-01-15T10:30:00Z",
      updated_at_pretty: "Jan 15, 2024",
      is_active: true,
    });
  });

  it("coerces id and strings to String type", () => {
    const apiData = {
      id: 12345,
      full_name: null,
      warehouse: undefined,
    };

    const result = toRow(apiData);

    expect(result.id).toBe("12345");
    expect(result.full_name).toBe("");
    expect(result.warehouse).toBe("");
  });

  it("handles null/undefined for optional fields", () => {
    const apiData = {
      id: "123",
      full_name: "Test",
      warehouse: "WH-001",
      tally_card_number: null,
      qty: null,
      location: undefined,
      note: null,
      updated_at: null,
      updated_at_pretty: null,
    };

    const result = toRow(apiData);

    expect(result.tally_card_number).toBeNull();
    expect(result.qty).toBeNull();
    expect(result.location).toBeNull();
    expect(result.note).toBeNull();
    expect(result.updated_at).toBeNull();
    expect(result.updated_at_pretty).toBeNull();
  });

  it("computes is_active correctly for positive qty", () => {
    const apiData1 = { id: "1", full_name: "Test", warehouse: "WH", qty: 5 };
    const apiData2 = { id: "2", full_name: "Test", warehouse: "WH", qty: 0 };
    const apiData3 = { id: "3", full_name: "Test", warehouse: "WH", qty: null };
    const apiData4 = { id: "4", full_name: "Test", warehouse: "WH", qty: undefined };

    expect(toRow(apiData1).is_active).toBe(true);
    expect(toRow(apiData2).is_active).toBe(false);
    expect(toRow(apiData3).is_active).toBe(false);
    expect(toRow(apiData4).is_active).toBe(false);
  });

  it("handles pretty date fallback logic (updated_at_pretty preferred)", () => {
    const apiData = {
      id: "123",
      full_name: "Test",
      warehouse: "WH",
      updated_at: "2024-01-15T10:30:00Z",
      updated_at_pretty: "Jan 15, 2024",
    };

    const result = toRow(apiData);

    expect(result.updated_at).toBe("2024-01-15T10:30:00Z");
    expect(result.updated_at_pretty).toBe("Jan 15, 2024");
  });

  it("handles missing or undefined input gracefully", () => {
    const result = toRow(undefined);

    expect(result).toEqual({
      id: "",
      full_name: "",
      warehouse: "",
      tally_card_number: null,
      item_number: null,
      qty: null,
      location: null,
      note: null,
      reason_code: null,
      multi_location: null,
      updated_at: null,
      updated_at_pretty: null,
      is_active: false,
    });
  });

  it("preserves type consistency across multiple calls", () => {
    const apiData = {
      id: "123",
      full_name: "Test",
      warehouse: "WH",
      qty: 10,
    };

    const result1 = toRow(apiData);
    const result2 = toRow(apiData);

    expect(result1).toEqual(result2);
    expect(typeof result1.id).toBe("string");
    expect(typeof result1.full_name).toBe("string");
    expect(typeof result1.warehouse).toBe("string");
  });
});

















