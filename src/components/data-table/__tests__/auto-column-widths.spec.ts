import { describe, it, expect } from "vitest";

import { computeAutoColumnPercents } from "@/components/data-table/auto-column-widths";

describe("computeAutoColumnPercents", () => {
  it("respects overrides and ignores routing/ignored ids", () => {
    const cols = [
      { id: "__select" },
      { id: "id", meta: { routingOnly: true } },
      { id: "name", header: "Name" },
      { id: "qty", header: "Qty" },
      { id: "notes", header: "Notes" },
    ] as any[];
    const rows = [
      { name: "Alpha", qty: 10, notes: "Short" },
      { name: "Beta", qty: 200, notes: "Very very long notes string that should push width" },
    ];

    const pct = computeAutoColumnPercents(cols, rows, {
      ignoreIds: ["id", "__select"],
      overrides: { qty: 12 },
      floorPct: 6,
      capPct: 40,
    });

    expect(pct).toHaveProperty("name");
    expect(pct).toHaveProperty("qty", 12);
    expect(pct).toHaveProperty("notes");
    expect(pct).not.toHaveProperty("id");
    expect(pct).not.toHaveProperty("__select");

    const total = Object.values(pct).reduce((s, n) => s + n, 0);
    // allow small rounding drift due to per-cell rounding to 2 decimals
    expect(total).toBeGreaterThan(98);
    expect(total).toBeLessThan(102.1);
  });
});
