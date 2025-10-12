import { describe, it, expect, vi, beforeEach } from "vitest";

// Build a deterministic in-memory dataset of 53 items
const makeRows = (n = 53) =>
  Array.from({ length: n }, (_, i) => ({
    id: String(i + 1),
    tally_card_number: `TC-${String(i + 1).padStart(3, "0")}`,
    warehouse: "BP-WH1",
    item_number: i + 1, // domain numeric
    note: null,
    is_active: true,
    created_at: null,
    updated_at: null,
  }));

// Capture last provider args for assertions
let lastArgs: any;

vi.mock("@/lib/supabase/factory", () => ({
  createSupabaseServerProvider: vi.fn(() => ({
    list: vi.fn(async (args: any) => {
      lastArgs = args;
      // Simulate server-side sort by tally_card_number ascending (defaultSort)
      const all = makeRows();
      const page = Math.max(1, Number(args.page) || 1);
      const pageSize = Math.max(1, Number(args.pageSize) || 50);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const slice = all.slice(start, end);
      return {
        rows: slice,
        total: all.length,
        page,
        pageSize,
      };
    }),
  })),
}));

// Force a projection shape (stringify item_number when not raw)
(vi as any).mock(
  "@/lib/data/resources/tally_cards/projection.ts",
  () => ({
    toRow: (d: any) => ({
      id: d.id,
      tally_card_number: d.tally_card_number,
      warehouse: d.warehouse,
      item_number: String(d.item_number),
      note: d.note,
      is_active: d.is_active,
      created_at: d.created_at,
      updated_at: d.updated_at,
    }),
  }),
  { virtual: true } as any
);


function expectResponse(res: any): asserts res is Response {
  expect(res).toBeInstanceOf(Response);
}

describe("pagination contract (integration, mocked provider)", () => {
  let GET!: (req: Request, ctx?: any) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/[resource]/route");
    GET = mod.GET as any;
  });

  it("returns correct counts for pageSize=20 across pages", async () => {
    // Page 1
    let req = new Request("http://x.local/api/tally_cards?page=1&pageSize=20");
    let res = await GET(req as any, { params: { resource: "tally_cards" } } as any);
    expectResponse(res);
    let body = await res.json();

    expect(lastArgs.page).toBe(1);
    expect(lastArgs.pageSize).toBe(20);
    expect(body.total).toBe(53);
    expect(body.rows).toHaveLength(20);
    expect(body.rows[0].id).toBe("1");
    expect(body.rows[19].id).toBe("20");

    // Page 2
    req = new Request("http://x.local/api/tally_cards?page=2&pageSize=20");
    res = await GET(req as any, { params: { resource: "tally_cards" } } as any);
    expectResponse(res);
    body = await res.json();

    expect(lastArgs.page).toBe(2);
    expect(lastArgs.pageSize).toBe(20);
    expect(body.total).toBe(53);
    expect(body.rows).toHaveLength(20);
    expect(body.rows[0].id).toBe("21");
    expect(body.rows[19].id).toBe("40");

    // Page 3 (remainder)
    req = new Request("http://x.local/api/tally_cards?page=3&pageSize=20");
    res = await GET(req as any, { params: { resource: "tally_cards" } } as any);
    expectResponse(res);
    body = await res.json();

    expect(lastArgs.page).toBe(3);
    expect(lastArgs.pageSize).toBe(20);
    expect(body.total).toBe(53);
    expect(body.rows).toHaveLength(13);
    expect(body.rows[0].id).toBe("41");
    expect(body.rows[12].id).toBe("53");
  });

  it("returns empty rows for out-of-range page (page > totalPages)", async () => {
    const req = new Request("http://x.local/api/tally_cards?page=99&pageSize=20");
    const res = await GET(req as any, { params: { resource: "tally_cards" } } as any);
    expectResponse(res);
    const body = await res.json();

    expect(lastArgs.page).toBe(99);
    expect(lastArgs.pageSize).toBe(20);
    expect(body.total).toBe(53);
    expect(body.rows).toHaveLength(0);
  });

  it("no overlaps or gaps between page 1 and 2", async () => {
    const req1 = new Request("http://x.local/api/tally_cards?page=1&pageSize=25");
    const res1 = await GET(req1 as any, { params: { resource: "tally_cards" } } as any);
    expectResponse(res1);
    const b1 = await res1.json();

    const req2 = new Request("http://x.local/api/tally_cards?page=2&pageSize=25");
    const res2 = await GET(req2 as any, { params: { resource: "tally_cards" } } as any);
    expectResponse(res2);
    const b2 = await res2.json();

    const ids1 = new Set(b1.rows.map((r: any) => r.id));
    const ids2 = new Set(b2.rows.map((r: any) => r.id));

    for (const id of ids1) expect(ids2.has(id)).toBe(false);

    const all = [...ids1, ...ids2].map(Number).sort((a, b) => a - b);
    expect(all[0]).toBe(1);
    expect(all[all.length - 1]).toBe(50);
    expect(all).toHaveLength(50);
  });

  it("respects raw=true pagination and type preservation", async () => {
    const req = new Request("http://x.local/api/tally_cards?page=1&pageSize=10&raw=true");
    const res = await GET(req as any, { params: { resource: "tally_cards" } } as any);
    expectResponse(res);
    const body = await res.json();

    expect(body.raw).toBe(true);
    expect(body.rows).toHaveLength(10);
    expect(typeof body.rows[0].item_number).toBe("number");
  });
});
