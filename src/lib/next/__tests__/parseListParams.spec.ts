import { describe, it, expect } from "vitest";
import {
  parseListParams,
  parsePagination,
  parsePositiveInt,
  resolveSearchParams,
  type SPRecord,
} from "../search-params";

describe("resolveSearchParams", () => {
  it("handles Promise<SPRecord>", async () => {
    const sp = Promise.resolve({ page: "2" });
    const result = await resolveSearchParams(sp);
    expect(result).toEqual({ page: "2" });
  });

  it("handles SPRecord directly", async () => {
    const sp = { page: "2" };
    const result = await resolveSearchParams(sp);
    expect(result).toEqual({ page: "2" });
  });

  it("handles undefined", async () => {
    const result = await resolveSearchParams(undefined);
    expect(result).toEqual({});
  });
});

describe("parsePositiveInt", () => {
  it("parses valid integer", () => {
    expect(parsePositiveInt("10", 5)).toBe(10);
    expect(parsePositiveInt("1", 5)).toBe(1);
  });

  it("returns fallback for invalid input", () => {
    expect(parsePositiveInt("abc", 5)).toBe(5);
    expect(parsePositiveInt("", 5)).toBe(5);
    expect(parsePositiveInt(undefined, 5)).toBe(5);
  });

  it("clamps to minimum", () => {
    expect(parsePositiveInt("0", 5, { min: 1 })).toBe(1);
    expect(parsePositiveInt("-10", 5, { min: 1 })).toBe(1);
  });

  it("clamps to maximum", () => {
    expect(parsePositiveInt("1000", 5, { max: 500 })).toBe(500);
    expect(parsePositiveInt("100", 5, { max: 500 })).toBe(100);
  });

  it("handles array values (takes first)", () => {
    expect(parsePositiveInt(["10", "20"], 5)).toBe(10);
    expect(parsePositiveInt(["abc", "20"], 5)).toBe(5);
  });
});

describe("parsePagination", () => {
  it("applies defaults when missing", () => {
    const sp: SPRecord = {};
    const result = parsePagination(sp, {
      defaultPage: 1,
      defaultPageSize: 50,
      min: 1,
      max: 500,
    });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it("parses pagination from search params", () => {
    const sp: SPRecord = { page: "2", pageSize: "25" };
    const result = parsePagination(sp, {
      defaultPage: 1,
      defaultPageSize: 50,
      min: 1,
      max: 500,
    });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(25);
  });

  it("clamps page to minimum", () => {
    const sp: SPRecord = { page: "0", pageSize: "10" };
    const result = parsePagination(sp, {
      defaultPage: 1,
      defaultPageSize: 50,
      min: 1,
      max: 500,
    });
    expect(result.page).toBe(1);
  });

  it("clamps pageSize to maximum", () => {
    const sp: SPRecord = { page: "1", pageSize: "1000" };
    const result = parsePagination(sp, {
      defaultPage: 1,
      defaultPageSize: 50,
      min: 1,
      max: 500,
    });
    expect(result.pageSize).toBe(500);
  });

  it("handles array values", () => {
    const sp: SPRecord = { page: ["2", "3"], pageSize: ["25", "50"] };
    const result = parsePagination(sp, {
      defaultPage: 1,
      defaultPageSize: 50,
      min: 1,
      max: 500,
    });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(25);
  });
});

describe("parseListParams", () => {
  it("applies default pagination when missing", () => {
    const sp: SPRecord = {};
    const result = parseListParams(sp, [], {
      defaultPage: 1,
      defaultPageSize: 5,
      max: 500,
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(5);
    expect(result.filters).toEqual({});
  });

  it("parses pagination from search params", () => {
    const sp: SPRecord = { page: "2", pageSize: "10" };
    const result = parseListParams(sp, [], {
      defaultPage: 1,
      defaultPageSize: 5,
      max: 500,
    });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.filters).toEqual({});
  });

  it("clamps page to minimum of 1", () => {
    const sp: SPRecord = { page: "0", pageSize: "10" };
    const result = parseListParams(sp, [], {
      defaultPage: 1,
      defaultPageSize: 5,
      max: 500,
    });

    expect(result.page).toBe(1);
  });

  it("clamps pageSize to maximum (500)", () => {
    const sp: SPRecord = { page: "1", pageSize: "1000" };
    const result = parseListParams(sp, [], {
      defaultPage: 1,
      defaultPageSize: 5,
      max: 500,
    });

    expect(result.pageSize).toBe(500);
  });

  it("extracts single filter value from search params", () => {
    const sp: SPRecord = { status: "ACTIVE" };
    const filterMeta = [{ id: "status" }];
    const result = parseListParams(sp, filterMeta, {
      defaultPage: 1,
      defaultPageSize: 5,
      max: 500,
    });

    expect(result.filters).toEqual({ status: "ACTIVE" });
  });

  it("extracts first element when filter param is array", () => {
    const sp: SPRecord = { status: ["ACTIVE", "ZERO"] };
    const filterMeta = [{ id: "status" }];
    const result = parseListParams(sp, filterMeta, {
      defaultPage: 1,
      defaultPageSize: 5,
      max: 500,
    });

    expect(result.filters).toEqual({ status: "ACTIVE" });
  });

  it("extracts multiple filters", () => {
    const sp: SPRecord = { status: "ACTIVE", type: "adjustment" };
    const filterMeta = [{ id: "status" }, { id: "type" }];
    const result = parseListParams(sp, filterMeta, {
      defaultPage: 1,
      defaultPageSize: 5,
      max: 500,
    });

    expect(result.filters).toEqual({ status: "ACTIVE", type: "adjustment" });
  });

  it("ignores non-string filter values", () => {
    const sp: SPRecord = { status: 123, type: "adjustment" };
    const filterMeta = [{ id: "status" }, { id: "type" }];
    const result = parseListParams(sp, filterMeta, {
      defaultPage: 1,
      defaultPageSize: 5,
      max: 500,
    });

    expect(result.filters).toEqual({ type: "adjustment" });
  });

  it("ignores filters not in quickFilterMeta", () => {
    const sp: SPRecord = { status: "ACTIVE", other: "value" };
    const filterMeta = [{ id: "status" }];
    const result = parseListParams(sp, filterMeta, {
      defaultPage: 1,
      defaultPageSize: 5,
      max: 500,
    });

    expect(result.filters).toEqual({ status: "ACTIVE" });
    expect(result.filters.other).toBeUndefined();
  });

  it("handles undefined filter values", () => {
    const sp: SPRecord = { status: undefined };
    const filterMeta = [{ id: "status" }];
    const result = parseListParams(sp, filterMeta, {
      defaultPage: 1,
      defaultPageSize: 5,
      max: 500,
    });

    expect(result.filters).toEqual({});
  });

  it("handles toQueryParam transform", () => {
    const sp: SPRecord = { warehouse: "WH1" };
    const filterMeta = [
      {
        id: "warehouse",
        toQueryParam: (value: string) => ({ "filters[warehouse][value]": value }),
      },
    ];
    // Note: parseListParams doesn't apply toQueryParam, it just extracts the filter
    // The transform would be applied elsewhere
    const result = parseListParams(sp, filterMeta, {
      defaultPage: 1,
      defaultPageSize: 5,
      max: 500,
    });
    expect(result.filters).toEqual({ warehouse: "WH1" });
  });
});


