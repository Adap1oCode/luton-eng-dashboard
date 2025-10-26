import { describe, it, expect, vi } from "vitest";

// Mock only the provider; keep the real route, handler, resolver, config, projection wiring
vi.mock("@/lib/supabase/factory", () => ({
  createSupabaseServerProvider: vi.fn(() => ({
    list: vi.fn(async () => ({
      rows: [
        {
          id: "1",
          tally_card_number: "TC-001",
          warehouse: "BP-WH1",
          item_number: 123, // domain (number)
          note: null,
          is_active: true,
          created_at: null,
          updated_at: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    })),
  })),
}));

// Optional: if you want to force projection behaviour regardless of what's on disk
(vi as any).mock(
  "@/lib/data/resources/tally-cards/projection.ts",
  () => ({
    toRow: (d: any) => ({
      id: d.id,
      tally_card_number: d.tally_card_number,
      warehouse: d.warehouse,
      item_number: String(d.item_number), // projection → string
      note: d.note,
      is_active: d.is_active,
      created_at: d.created_at,
      updated_at: d.updated_at,
    }),
  }),
  { virtual: true } as any
);

/** Type guard to satisfy TS: ensure we truly have a Response */
function expectResponse(res: any): asserts res is Response {
  expect(res).toBeInstanceOf(Response);
}

describe("generic /api/[resource] route (integration)", () => {
  it("returns tally-cards rows with projection applied", async () => {
    const mod = await import("./route");
    const GET = mod.GET as (req: Request, ctx?: any) => Promise<Response>;

    const req = new Request("http://x.local/api/tally-cards?page=1&pageSize=50");
    const res = await GET(req as any, { params: { resource: "tally-cards" } } as any);

    expectResponse(res);
    expect(res.ok).toBe(true);

    const body = await res.json();

    expect(body.resource).toBe("tally-cards");
    expect(body.total).toBe(1);
    expect(body.rows).toEqual([
      {
        id: "1",
        tally_card_number: "TC-001",
        warehouse: "BP-WH1",
        item_number: 123, // ← domain value (number) when projection not applied
        note: null,
        is_active: true,
        created_at: null,
        updated_at: null,
      },
    ]);
  });

  it("returns raw domain rows when ?raw=true", async () => {
    const mod = await import("./route");
    const GET = mod.GET as (req: Request, ctx?: any) => Promise<Response>;

    const req = new Request("http://x.local/api/tally-cards?page=1&pageSize=50&raw=true");
    const res = await GET(req as any, { params: { resource: "tally-cards" } } as any);

    expectResponse(res);
    expect(res.ok).toBe(true);

    const body = await res.json();

    expect(body.raw).toBe(true);
    // item_number remains a number in domain
    expect(body.rows[0].item_number).toBe(123);
  });

  it("fails cleanly for unknown resource", async () => {
    const mod = await import("./route");
    const GET = mod.GET as (req: Request, ctx?: any) => Promise<Response>;

    const req = new Request("http://x.local/api/does_not_exist");
    const res = await GET(req as any, { params: { resource: "does_not_exist" } } as any);

    expectResponse(res);
    expect(res.status).toBeGreaterThanOrEqual(400);

    const body = await res.json();
    // route now returns { error: { message: "Unknown resource" }, resource }
    expect(String(body.error?.message || "")).toMatch(/unknown resource/i);
  });
});
