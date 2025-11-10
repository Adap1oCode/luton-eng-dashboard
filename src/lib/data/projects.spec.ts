import { describe, it, expect } from "vitest";
import { projectRows, type Projection } from "./projects";

type Domain = {
  id: string;
  name: string;
  qty: number;
  extra: string;
};

type View = {
  id: string;
  name: string;
  qtyString: string;
};

describe("projectRows", () => {
  it("maps by key", () => {
    const rows: Domain[] = [
      { id: "1", name: "A", qty: 10, extra: "ignored" },
      { id: "2", name: "B", qty: 20, extra: "ignored" },
    ];
    const spec: Projection<Domain, { id: string; name: string }> = {
      id: "id",
      name: "name",
    };
    const result = projectRows(rows, spec);
    expect(result).toEqual([
      { id: "1", name: "A" },
      { id: "2", name: "B" },
    ]);
    expect(result[0]).not.toHaveProperty("extra");
    expect(result[0]).not.toHaveProperty("qty");
  });

  it("maps by function", () => {
    const rows: Domain[] = [{ id: "1", name: "A", qty: 10, extra: "ignored" }];
    const spec: Projection<Domain, { qtyString: string }> = {
      qtyString: (r) => String(r.qty),
    };
    const result = projectRows(rows, spec);
    expect(result).toEqual([{ qtyString: "10" }]);
    expect(result[0]).not.toHaveProperty("id");
    expect(result[0]).not.toHaveProperty("qty");
  });

  it("handles mixed mapping", () => {
    const rows: Domain[] = [
      { id: "1", name: "A", qty: 10, extra: "ignored" },
      { id: "2", name: "B", qty: 20, extra: "ignored" },
    ];
    const spec: Projection<Domain, View> = {
      id: "id",
      name: "name",
      qtyString: (r) => String(r.qty),
    };
    const result = projectRows(rows, spec);
    expect(result).toEqual([
      { id: "1", name: "A", qtyString: "10" },
      { id: "2", name: "B", qtyString: "20" },
    ]);
    expect(result[0]).not.toHaveProperty("qty");
    expect(result[0]).not.toHaveProperty("extra");
  });

  it("handles empty rows", () => {
    const spec: Projection<Domain, { id: string }> = { id: "id" };
    expect(projectRows([], spec)).toEqual([]);
  });

  it("handles null/undefined domain values", () => {
    const rows = [
      { id: "1", name: null, qty: 10, extra: "ignored" },
      { id: "2", name: undefined, qty: 20, extra: "ignored" },
    ] as any;
    const spec: Projection<Domain, { id: string; name: any }> = {
      id: "id",
      name: "name",
    };
    const result = projectRows(rows, spec);
    expect(result).toEqual([
      { id: "1", name: null },
      { id: "2", name: undefined },
    ]);
  });

  it("preserves function return types", () => {
    const rows: Domain[] = [{ id: "1", name: "A", qty: 10, extra: "ignored" }];
    const spec: Projection<Domain, { computed: number }> = {
      computed: (r) => r.qty * 2,
    };
    const result = projectRows(rows, spec);
    expect(result[0].computed).toBe(20);
    expect(typeof result[0].computed).toBe("number");
  });

  it("handles complex function transformations", () => {
    const rows: Domain[] = [
      { id: "1", name: "Item A", qty: 10, extra: "ignored" },
      { id: "2", name: "Item B", qty: 25, extra: "ignored" },
    ];
    const spec: Projection<Domain, { label: string; isHighQty: boolean }> = {
      label: (r) => `${r.name} (${r.qty})`,
      isHighQty: (r) => r.qty > 20,
    };
    const result = projectRows(rows, spec);
    expect(result).toEqual([
      { label: "Item A (10)", isHighQty: false },
      { label: "Item B (25)", isHighQty: true },
    ]);
  });
});














