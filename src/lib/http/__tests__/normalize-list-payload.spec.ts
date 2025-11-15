import { describe, it, expect } from "vitest";
import { normalizeListPayload } from "../normalize-list-payload";

describe("normalizeListPayload", () => {
  it("handles {rows, total} format", () => {
    const payload = {
      rows: [{ id: "1", name: "Item 1" }],
      total: 100,
    };

    const result = normalizeListPayload(payload);

    expect(result).toEqual({
      rows: [{ id: "1", name: "Item 1" }],
      total: 100,
    });
  });

  it("handles {data, count} format", () => {
    const payload = {
      data: [{ id: "1", name: "Item 1" }],
      count: 50,
    };

    const result = normalizeListPayload(payload);

    expect(result).toEqual({
      rows: [{ id: "1", name: "Item 1" }],
      total: 50,
    });
  });

  it("prefers rows over data when both exist", () => {
    const payload = {
      rows: [{ id: "1" }],
      data: [{ id: "2" }],
      total: 10,
      count: 20,
    };

    const result = normalizeListPayload(payload);

    expect(result.rows).toEqual([{ id: "1" }]);
    expect(result.total).toBe(10); // Prefers total over count
  });

  it("handles missing total/count by using rows length", () => {
    const payload = {
      rows: [{ id: "1" }, { id: "2" }, { id: "3" }],
    };

    const result = normalizeListPayload(payload);

    expect(result.total).toBe(3);
  });

  it("handles empty payload", () => {
    const payload = {};

    const result = normalizeListPayload(payload);

    expect(result).toEqual({
      rows: [],
      total: 0,
    });
  });

  it("handles null/undefined payload", () => {
    expect(normalizeListPayload(null)).toEqual({ rows: [], total: 0 });
    expect(normalizeListPayload(undefined)).toEqual({ rows: [], total: 0 });
  });

  it("handles invalid total/count values", () => {
    const payload = {
      rows: [{ id: "1" }],
      total: "not-a-number",
      count: NaN,
    };

    const result = normalizeListPayload(payload);

    expect(result.total).toBe(1); // Falls back to rows.length
  });

  it("handles Infinity total/count", () => {
    const payload = {
      rows: [{ id: "1" }],
      total: Infinity,
    };

    const result = normalizeListPayload(payload);

    expect(result.total).toBe(1); // Falls back to rows.length for non-finite
  });
});





























