import { afterEach, describe, expect, it, vi } from "vitest";

// Virtual resource modules used by the tests
const VIRTUAL_CONFIG = {
  table: "tally_cards",
  select: "id,updated_at",
  pk: "id",
  defaultSort: { column: "id", desc: false },
  search: [] as string[],
  toDomain: (x: any) => x
};

const VIRTUAL_PROJECTION = {
  toRow: (d: any) => ({ id: d.id, updated_at: d.updated_at })
};

describe("resolveResource (tally_cards only)", () => {
  afterEach(() => {
    // reset between tests so mocks from one test do not leak into another
    vi.resetModules();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("loads config and optional projection by convention", async () => {
    // Mock the dynamic imports Vitest will resolve
    (vi as any).mock("@/lib/data/resources/tally_cards/config", () => ({
      default: VIRTUAL_CONFIG,
      allowRaw: true
    }), { virtual: true });

    (vi as any).mock("@/lib/data/resources/tally_cards/projection", () => ({
      toRow: VIRTUAL_PROJECTION.toRow
    }), { virtual: true });

    const { resolveResource } = await import("./resolve-resource");
    const entry = await resolveResource("tally_cards");

    expect(entry.key).toBe("tally_cards");
    expect(entry.config.table).toBe("tally_cards");
    expect(entry.config.select).toBe("id,updated_at");
    expect(typeof entry.toRow).toBe("function");
    expect(entry.allowRaw).toBe(true);
  });
});
