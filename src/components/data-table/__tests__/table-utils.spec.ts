import { describe, it, expect } from "vitest";

import { stringPredicate } from "@/components/data-table/table-utils";

describe("stringPredicate", () => {
  it("handles contains/startsWith/endsWith/equals/notEquals", () => {
    expect(stringPredicate("Hello", "ell", "contains")).toBe(true);
    expect(stringPredicate("Hello", "Hel", "startsWith")).toBe(true);
    expect(stringPredicate("Hello", "llo", "endsWith")).toBe(true);
    expect(stringPredicate("Hello", "hello", "equals")).toBe(true);
    expect(stringPredicate("Hello", "world", "notEquals")).toBe(true);
  });
});
