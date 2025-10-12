import { describe, expect, it, vi } from "vitest";

describe("[resource] route delegator", () => {
  it("delegates GET to listHandler with ctx.params.resource", async () => {
    // Mock the module BEFORE importing the route file
    vi.mock("@/lib/api/handle-list", () => ({
      listHandler: vi.fn(async (_req: Request, resource: string) => {
        expect(resource).toBe("tally_cards");
        return new Response(JSON.stringify({ ok: true, resource }), {
          headers: { "content-type": "application/json" }
        });
      })
    }));

    const mod = await import("./route");
    const res = await mod.GET(
      new Request("http://x.local/api/tally_cards?page=1"),
      { params: { resource: "tally_cards" } }
    );

    expect(res).toBeInstanceOf(Response);
    const body = await res.json();
    expect(body).toEqual({ ok: true, resource: "tally_cards" });
  });
});
