import { describe, it, expect } from "vitest";
import { parseListQuery, toBool, toClampedInt } from "./list-params";

function U(url: string) {
  return new URL(url);
}

describe("parseListQuery", () => {
  it("applies defaults when missing", () => {
    const q = parseListQuery(U("http://x.local/api/foo"));
    expect(q).toEqual({
      q: undefined,
      page: 1,
      pageSize: 50,
      activeOnly: false,
      raw: false
    });
  });

  it("trims q and clamps page + pageSize", () => {
    const q = parseListQuery(
      U("http://x.local/api/foo?q=%20abc%20&page=0&pageSize=999999")
    );
    expect(q.q).toBe("abc");
    expect(q.page).toBe(1);       // clamped min
    expect(q.pageSize).toBe(500); // clamped max
  });

  it("recognises boolean toggles", () => {
    const q1 = parseListQuery(U("http://x/api/foo?activeOnly=1&raw=true"));
    expect(q1.activeOnly).toBe(true);
    expect(q1.raw).toBe(true);

    const q2 = parseListQuery(U("http://x/api/foo?activeOnly=no&raw=0"));
    expect(q2.activeOnly).toBe(false);
    expect(q2.raw).toBe(false);
  });

  it("handles URL encoding", () => {
    const q = parseListQuery(U("http://x.local/api/foo?q=hello%20world"));
    expect(q.q).toBe("hello world");
  });

  it("exposes searchParams for advanced consumers", () => {
    const url = U("http://x.local/api/foo?filters[status][value]=ACTIVE&status=A&status=B");
    const q = parseListQuery(url);
    // searchParams should be accessible (non-enumerable property)
    const sp = (q as any).searchParams;
    expect(sp).toBeInstanceOf(URLSearchParams);
    expect(sp.getAll("status")).toEqual(["A", "B"]);
    expect(sp.get("filters[status][value]")).toBe("ACTIVE");
  });

  it("handles empty/undefined/null gracefully", () => {
    const q1 = parseListQuery(U("http://x.local/api/foo"));
    expect(q1.q).toBeUndefined();
    expect(q1.page).toBe(1);
    expect(q1.pageSize).toBe(50);
    expect(q1.activeOnly).toBe(false);
    expect(q1.raw).toBe(false);

    // Empty string params are parsed as 0, then clamped to min (1 for page, 1 for pageSize)
    const q2 = parseListQuery(U("http://x.local/api/foo?q=&page=&pageSize="));
    expect(q2.q).toBeUndefined();
    expect(q2.page).toBe(1); // empty string -> 0 -> clamped to min 1
    expect(q2.pageSize).toBe(1); // empty string -> 0 -> clamped to min 1
  });

  it("clamps page to boundaries", () => {
    expect(parseListQuery(U("http://x.local/api/foo?page=-10")).page).toBe(1);
    expect(parseListQuery(U("http://x.local/api/foo?page=0")).page).toBe(1);
    expect(parseListQuery(U("http://x.local/api/foo?page=1")).page).toBe(1);
    expect(parseListQuery(U("http://x.local/api/foo?page=1000000")).page).toBe(1_000_000);
    expect(parseListQuery(U("http://x.local/api/foo?page=2000000")).page).toBe(1_000_000);
  });

  it("clamps pageSize to boundaries", () => {
    expect(parseListQuery(U("http://x.local/api/foo?pageSize=0")).pageSize).toBe(1);
    expect(parseListQuery(U("http://x.local/api/foo?pageSize=-10")).pageSize).toBe(1);
    expect(parseListQuery(U("http://x.local/api/foo?pageSize=50")).pageSize).toBe(50);
    expect(parseListQuery(U("http://x.local/api/foo?pageSize=500")).pageSize).toBe(500);
    expect(parseListQuery(U("http://x.local/api/foo?pageSize=501")).pageSize).toBe(500);
    expect(parseListQuery(U("http://x.local/api/foo?pageSize=999999")).pageSize).toBe(500);
  });
});

describe("toBool", () => {
  it.each([
    ["1", true],
    ["true", true],
    ["yes", true],
    ["TRUE", true],
    ["YES", true],
    ["0", false],
    ["false", false],
    ["no", false],
    ["FALSE", false],
    ["NO", false],
    ["", false],
    [" ", false],
    ["anything", false],
  ])("coerces '%s' to %s", (input, expected) => {
    expect(toBool(input)).toBe(expected);
  });

  it("handles null/undefined", () => {
    expect(toBool(null)).toBe(false);
    expect(toBool(undefined)).toBe(false);
  });
});

describe("toClampedInt", () => {
  it("clamps to min", () => {
    expect(toClampedInt("-10", { def: 50, min: 1, max: 100 })).toBe(1);
    expect(toClampedInt("0", { def: 50, min: 1, max: 100 })).toBe(1);
    expect(toClampedInt("1", { def: 50, min: 1, max: 100 })).toBe(1);
  });

  it("clamps to max", () => {
    expect(toClampedInt("999", { def: 50, min: 1, max: 100 })).toBe(100);
    expect(toClampedInt("100", { def: 50, min: 1, max: 100 })).toBe(100);
    expect(toClampedInt("101", { def: 50, min: 1, max: 100 })).toBe(100);
  });

  it("returns value within range", () => {
    expect(toClampedInt("50", { def: 1, min: 1, max: 100 })).toBe(50);
    expect(toClampedInt("25", { def: 1, min: 1, max: 100 })).toBe(25);
    expect(toClampedInt("75", { def: 1, min: 1, max: 100 })).toBe(75);
  });

  it("handles NaN", () => {
    expect(toClampedInt("abc", { def: 50, min: 1, max: 100 })).toBe(50);
    expect(toClampedInt("NaN", { def: 50, min: 1, max: 100 })).toBe(50);
    expect(toClampedInt("12.34", { def: 50, min: 1, max: 100 })).toBe(12); // floors
  });

  it("handles null/undefined", () => {
    expect(toClampedInt(null, { def: 50, min: 1, max: 100 })).toBe(50);
    expect(toClampedInt(undefined, { def: 50, min: 1, max: 100 })).toBe(50);
  });

  it("floors decimal values", () => {
    expect(toClampedInt("12.9", { def: 1, min: 1, max: 100 })).toBe(12);
    expect(toClampedInt("99.99", { def: 1, min: 1, max: 100 })).toBe(99);
  });
});
