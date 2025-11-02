import { describe, it, expect } from "vitest";
import { parseListParams, type SPRecord } from "../search-params";

describe("parseListParams", () => {
  it("applies default pagination when missing", () => {
    const sp: SPRecord = {};
    const result = parseListParams(sp, [], { defaultPage: 1, defaultPageSize: 5, max: 500 });
    
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(5);
    expect(result.filters).toEqual({});
  });

  it("parses pagination from search params", () => {
    const sp: SPRecord = { page: "2", pageSize: "10" };
    const result = parseListParams(sp, [], { defaultPage: 1, defaultPageSize: 5, max: 500 });
    
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.filters).toEqual({});
  });

  it("clamps page to minimum of 1", () => {
    const sp: SPRecord = { page: "0", pageSize: "10" };
    const result = parseListParams(sp, [], { defaultPage: 1, defaultPageSize: 5, max: 500 });
    
    expect(result.page).toBe(1);
  });

  it("clamps pageSize to maximum (500)", () => {
    const sp: SPRecord = { page: "1", pageSize: "1000" };
    const result = parseListParams(sp, [], { defaultPage: 1, defaultPageSize: 5, max: 500 });
    
    expect(result.pageSize).toBe(500);
  });

  it("extracts single filter value from search params", () => {
    const sp: SPRecord = { status: "ACTIVE" };
    const filterMeta = [{ id: "status" }];
    const result = parseListParams(sp, filterMeta, { defaultPage: 1, defaultPageSize: 5, max: 500 });
    
    expect(result.filters).toEqual({ status: "ACTIVE" });
  });

  it("extracts first element when filter param is array", () => {
    const sp: SPRecord = { status: ["ACTIVE", "ZERO"] };
    const filterMeta = [{ id: "status" }];
    const result = parseListParams(sp, filterMeta, { defaultPage: 1, defaultPageSize: 5, max: 500 });
    
    expect(result.filters).toEqual({ status: "ACTIVE" });
  });

  it("extracts multiple filters", () => {
    const sp: SPRecord = { status: "ACTIVE", type: "adjustment" };
    const filterMeta = [{ id: "status" }, { id: "type" }];
    const result = parseListParams(sp, filterMeta, { defaultPage: 1, defaultPageSize: 5, max: 500 });
    
    expect(result.filters).toEqual({ status: "ACTIVE", type: "adjustment" });
  });

  it("ignores non-string filter values", () => {
    const sp: SPRecord = { status: 123, type: "adjustment" };
    const filterMeta = [{ id: "status" }, { id: "type" }];
    const result = parseListParams(sp, filterMeta, { defaultPage: 1, defaultPageSize: 5, max: 500 });
    
    expect(result.filters).toEqual({ type: "adjustment" });
  });

  it("ignores filters not in quickFilterMeta", () => {
    const sp: SPRecord = { status: "ACTIVE", other: "value" };
    const filterMeta = [{ id: "status" }];
    const result = parseListParams(sp, filterMeta, { defaultPage: 1, defaultPageSize: 5, max: 500 });
    
    expect(result.filters).toEqual({ status: "ACTIVE" });
    expect(result.filters.other).toBeUndefined();
  });

  it("handles undefined filter values", () => {
    const sp: SPRecord = { status: undefined };
    const filterMeta = [{ id: "status" }];
    const result = parseListParams(sp, filterMeta, { defaultPage: 1, defaultPageSize: 5, max: 500 });
    
    expect(result.filters).toEqual({});
  });
});


