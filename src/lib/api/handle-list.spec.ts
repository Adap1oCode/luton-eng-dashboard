import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const fakeRows = [
  { id: 1, foo: "A", updated_at: "2024-01-01" },
  { id: 2, foo: "B", updated_at: "2024-02-01" }
];

const mockResolve = {
  key: "tally_cards",
  config: {
    table: "tally_cards",
    select: "id,foo,updated_at",
    pk: "id",
    defaultSort: { column: "id", desc: false },
    toDomain: (x: any) => x
  },
  toRow: (d: any) => ({ id: d.id, foo: d.foo }),
  allowRaw: true
};

describe("listHandler", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();

    vi.mock("@/lib/api/resolve-resource", () => ({
      resolveResource: vi.fn(async () => mockResolve)
    }));

    vi.mock("@/lib/supabase/factory", () => ({
      createSupabaseServerProvider: vi.fn(() => ({
        list: vi.fn(async ({ page, pageSize }: { page: number; pageSize: number }) => {
          const start = (page - 1) * pageSize;
          const end = start + pageSize;
          const slice = fakeRows.slice(start, end);
          return { rows: slice, total: fakeRows.length };
        })
      }))
    }));
  });

  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("applies projection by default", async () => {
    const { listHandler } = await import("./handle-list");

    const req = new Request("http://x.local/api/tally_cards?page=1&pageSize=1");
    const res = await listHandler(req, "tally_cards");
    const body = await res.json();

    expect(body.resource).toBe("tally_cards");
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(1);
    expect(body.total).toBe(2);
    expect(body.rows).toEqual([{ id: 1, foo: "A" }]);
    expect(body.raw).toBe(false);
  });

  it("returns domain rows when raw=true and allowed", async () => {
    const { listHandler } = await import("./handle-list");

    const req = new Request("http://x.local/api/tally_cards?page=1&pageSize=2&raw=true");
    const res = await listHandler(req, "tally_cards");
    const body = await res.json();

    expect(body.rows).toEqual(fakeRows);
    expect(body.raw).toBe(true);
  });

  it("clamps pageSize and page", async () => {
    const { listHandler } = await import("./handle-list");

    const req = new Request("http://x.local/api/tally_cards?page=-10&pageSize=999999");
    const res = await listHandler(req, "tally_cards");
    const body = await res.json();

    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(500);
    expect(body.total).toBe(2);
    expect(body.rows.length).toBe(2);
  });

  it("rejects raw=true if not allowed", async () => {
    vi.doMock("@/lib/api/resolve-resource", () => ({
      resolveResource: vi.fn(async () => ({
        ...mockResolve,
        allowRaw: false
      }))
    }));

    const { listHandler } = await import("./handle-list");
    const req = new Request("http://x.local/api/tally_cards?raw=true");
    const res = await listHandler(req, "tally_cards");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toMatch(/Raw mode is not allowed/);
  });
});
