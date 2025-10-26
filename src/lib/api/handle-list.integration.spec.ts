import { describe, it, expect, vi } from "vitest";

/**
 * We mock the exact module specifiers that resolve-resource.ts imports:
 * "@/lib/data/resources/tally_cards/config.ts" and "@/lib/data/resources/tally_cards/projection.ts"
 * This guarantees we're testing the convention path.
 */

(vi as any).mock("@/lib/data/resources/tally-cards/config.ts", () => ({
  default: {
    table: "tcm_tally_cards",
    select: "id, foo",
    pk: "id",
    defaultSort: { column: "id", desc: false },
    toDomain: (x: any) => x,
  },
  allowRaw: true,
}), { virtual: true } as any);

(vi as any).mock("@/lib/data/resources/tally-cards/projection.ts", () => ({
  toRow: (d: any) => ({ id: d.id, foo: d.foo }),
}), { virtual: true } as any);

vi.mock("@/lib/supabase/factory", () => ({
  createSupabaseServerProvider: vi.fn(() => ({
    list: vi.fn(async () => ({
      rows: [{ id: 1, foo: "A" }, { id: 2, foo: "B" }],
      total: 2,
    })),
  })),
}));

describe("handle-list integration", () => {
  it("uses the convention-based resource config to fetch & shape rows", async () => {
    const { listHandler } = await import("./handle-list");
    const req = new Request("http://x.local/api/tally-cards?page=1&pageSize=2");
    const res = await listHandler(req, "tally-cards");
    const body = await res.json();

    expect(body.resource).toBe("tally-cards");
    expect(body.total).toBe(2);
    // Projection applied
    expect(body.rows).toEqual([{ id: 1, foo: "A" }, { id: 2, foo: "B" }]);
  });

  it("fails when no resource config exists", async () => {
    const { listHandler } = await import("./handle-list");
    const req = new Request("http://x.local/api/does_not_exist");
    const res = await listHandler(req, "does_not_exist");

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.message).toMatch(/unknown resource/i);
  });
});
