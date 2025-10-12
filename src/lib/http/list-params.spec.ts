import { describe, it, expect } from "vitest";
import { parseListQuery } from "./list-params";

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
});
