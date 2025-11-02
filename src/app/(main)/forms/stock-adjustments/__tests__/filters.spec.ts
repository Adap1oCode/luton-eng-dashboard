import { describe, it, expect } from "vitest";
import { statusToQuery } from "../filters";

describe("statusToQuery", () => {
  it("maps ACTIVE status to correct query params", () => {
    const result = statusToQuery("ACTIVE");

    expect(result).toEqual({
      qty_gt: 0,
      qty_not_null: true,
    });
  });

  it("maps ZERO status to correct query params", () => {
    const result = statusToQuery("ZERO");

    expect(result).toEqual({
      qty_eq: 0,
    });
  });

  it("returns empty object for ALL status", () => {
    const result = statusToQuery("ALL");

    expect(result).toEqual({});
  });

  it("returns empty object for unknown status values", () => {
    expect(statusToQuery("UNKNOWN")).toEqual({});
    expect(statusToQuery("")).toEqual({});
    expect(statusToQuery("anything")).toEqual({});
  });

  it("is case-sensitive (ACTIVE vs active)", () => {
    const result1 = statusToQuery("ACTIVE");
    const result2 = statusToQuery("active");

    expect(result1).toEqual({ qty_gt: 0, qty_not_null: true });
    expect(result2).toEqual({}); // Unknown value
  });

  it("produces consistent results across multiple calls", () => {
    const result1 = statusToQuery("ACTIVE");
    const result2 = statusToQuery("ACTIVE");

    // Results are equal (same structure), though not same object reference
    expect(result1).toEqual(result2);
    expect(result1).toStrictEqual(result2);
  });
});

