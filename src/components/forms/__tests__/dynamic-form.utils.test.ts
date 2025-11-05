/**
 * Unit tests for dynamic-form utility functions.
 * These are pure functions, making them ideal for unit testing.
 */

import { describe, it, expect } from "vitest";
import {
  clamp,
  autoPlaceRowFirst,
  autoPlaceColumnFirst,
  colStartClass,
  colSpanClass,
  gridColsClass,
} from "../dynamic-form.utils";
import type { FieldDef } from "../dynamic-field";

describe("clamp", () => {
  it("should return value within bounds", () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(1, 1, 10)).toBe(1);
    expect(clamp(10, 1, 10)).toBe(10);
  });

  it("should clamp values below minimum", () => {
    expect(clamp(0, 1, 10)).toBe(1);
    expect(clamp(-5, 1, 10)).toBe(1);
  });

  it("should clamp values above maximum", () => {
    expect(clamp(11, 1, 10)).toBe(10);
    expect(clamp(100, 1, 10)).toBe(10);
  });
});

describe("autoPlaceRowFirst", () => {
  it("should place fields sequentially in rows", () => {
    const fields: FieldDef[] = [
      { name: "field1", label: "Field 1", kind: "text" },
      { name: "field2", label: "Field 2", kind: "text" },
      { name: "field3", label: "Field 3", kind: "text" },
    ];

    const result = autoPlaceRowFirst(fields, 3);

    expect(result[0].column).toBe(1);
    expect(result[1].column).toBe(2);
    expect(result[2].column).toBe(3);
  });

  it("should wrap to next row when row is full", () => {
    const fields: FieldDef[] = [
      { name: "field1", label: "Field 1", kind: "text" },
      { name: "field2", label: "Field 2", kind: "text" },
      { name: "field3", label: "Field 3", kind: "text" },
      { name: "field4", label: "Field 4", kind: "text" },
    ];

    const result = autoPlaceRowFirst(fields, 3);

    expect(result[0].column).toBe(1);
    expect(result[1].column).toBe(2);
    expect(result[2].column).toBe(3);
    expect(result[3].column).toBe(1); // Wrapped to new row
  });

  it("should respect explicit column assignments", () => {
    const fields: FieldDef[] = [
      { name: "field1", label: "Field 1", kind: "text", column: 2 },
      { name: "field2", label: "Field 2", kind: "text" },
    ];

    const result = autoPlaceRowFirst(fields, 3);

    expect(result[0].column).toBe(2); // Explicit column preserved
    expect(result[1].column).toBe(3); // Next field starts after explicit
  });

  it("should handle field spans correctly", () => {
    const fields: FieldDef[] = [
      { name: "field1", label: "Field 1", kind: "text", span: 2 },
      { name: "field2", label: "Field 2", kind: "text" },
    ];

    const result = autoPlaceRowFirst(fields, 3);

    expect(result[0].column).toBe(1);
    expect(result[0].span).toBe(2);
    expect(result[1].column).toBe(3); // Next field starts after span
  });

  it("should wrap span that exceeds row width", () => {
    const fields: FieldDef[] = [
      { name: "field1", label: "Field 1", kind: "text", span: 3 },
      { name: "field2", label: "Field 2", kind: "text", span: 2 },
    ];

    const result = autoPlaceRowFirst(fields, 3);

    expect(result[0].column).toBe(1);
    expect(result[1].column).toBe(1); // Wrapped to new row because span of 2 doesn't fit after span of 3
  });
});

describe("autoPlaceColumnFirst", () => {
  it("should place fields in columns first", () => {
    const fields: FieldDef[] = [
      { name: "field1", label: "Field 1", kind: "text" },
      { name: "field2", label: "Field 2", kind: "text" },
      { name: "field3", label: "Field 3", kind: "text" },
      { name: "field4", label: "Field 4", kind: "text" },
    ];

    const result = autoPlaceColumnFirst(fields, 2);

    expect(result[0].column).toBe(1); // First column
    expect(result[1].column).toBe(1); // First column
    expect(result[2].column).toBe(2); // Second column
    expect(result[3].column).toBe(2); // Second column
  });

  it("should respect explicit column assignments", () => {
    const fields: FieldDef[] = [
      { name: "field1", label: "Field 1", kind: "text", column: 2 },
      { name: "field2", label: "Field 2", kind: "text" },
    ];

    const result = autoPlaceColumnFirst(fields, 2);

    expect(result[0].column).toBe(2); // Explicit column preserved
    expect(result[1].column).toBe(1); // Auto-placed in first column
  });
});

describe("colStartClass", () => {
  it("should return correct Tailwind classes for valid inputs", () => {
    expect(colStartClass(1)).toBe("lg:col-start-1");
    expect(colStartClass(2)).toBe("lg:col-start-2");
    expect(colStartClass(3)).toBe("lg:col-start-3");
    expect(colStartClass(4)).toBe("lg:col-start-4");
  });

  it("should default to col-start-1 for invalid inputs", () => {
    expect(colStartClass(0)).toBe("lg:col-start-1");
    expect(colStartClass(5)).toBe("lg:col-start-1");
    expect(colStartClass(-1)).toBe("lg:col-start-1");
  });
});

describe("colSpanClass", () => {
  it("should return correct Tailwind classes for valid inputs", () => {
    expect(colSpanClass(1)).toBe("lg:col-span-1");
    expect(colSpanClass(2)).toBe("lg:col-span-2");
    expect(colSpanClass(3)).toBe("lg:col-span-3");
    expect(colSpanClass(4)).toBe("lg:col-span-4");
  });

  it("should default to col-span-1 for invalid inputs", () => {
    expect(colSpanClass(0)).toBe("lg:col-span-1");
    expect(colSpanClass(5)).toBe("lg:col-span-1");
    expect(colSpanClass(-1)).toBe("lg:col-span-1");
  });
});

describe("gridColsClass", () => {
  it("should return correct classes for 1 column", () => {
    expect(gridColsClass(1)).toBe("grid grid-cols-1 gap-8");
  });

  it("should return correct classes for 2 columns", () => {
    expect(gridColsClass(2)).toBe("grid grid-cols-1 gap-8 lg:grid-cols-2");
  });

  it("should return correct classes for 3 columns", () => {
    expect(gridColsClass(3)).toBe("grid grid-cols-1 gap-8 lg:grid-cols-3");
  });

  it("should return correct classes for 4 columns", () => {
    expect(gridColsClass(4)).toBe("grid grid-cols-1 gap-8 lg:grid-cols-3 xl:grid-cols-4");
  });

  it("should handle edge cases", () => {
    expect(gridColsClass(0)).toBe("grid grid-cols-1 gap-8");
    expect(gridColsClass(5)).toBe("grid grid-cols-1 gap-8 lg:grid-cols-3 xl:grid-cols-4");
  });
});

