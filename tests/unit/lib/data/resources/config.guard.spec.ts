import { describe, it, expect } from "vitest";

// Minimal runtime guard to catch missing table/select, wrong export shape, etc.
function assertValidConfig(mod: any) {
  const cfg = mod?.default ?? mod?.config ?? mod?.tcmTallyCardsConfig;
  expect(cfg, "config export missing").toBeTruthy();
  expect(typeof cfg.table, "table must be a string").toBe("string");
  expect(cfg.table.length, "table must not be empty").toBeGreaterThan(0);
  expect(typeof cfg.select, "select must be a string").toBe("string");
  expect(cfg.select.length, "select must not be empty").toBeGreaterThan(0);
}

describe("resource config guards", () => {
  it("tally_cards config is valid", async () => {
    const mod = await import("@/lib/data/resources/tally_cards/config");
    assertValidConfig(mod);
  });

  // Add more resources here later (warehouses, requisitions, etc.)
});
