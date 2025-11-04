import { describe, it, expect } from "vitest";
import { tallyCardsFilterMeta } from "../tally-cards.config";

describe("tallyCardsFilterMeta", () => {
  it("has status quick filter configured", () => {
    // Tally cards have status filter (Active/Inactive)
    expect(tallyCardsFilterMeta).toHaveLength(1);
    expect(tallyCardsFilterMeta[0].id).toBe("status");
    expect(typeof tallyCardsFilterMeta[0].toQueryParam).toBe("function");
  });

  it("is an array with status filter", () => {
    expect(Array.isArray(tallyCardsFilterMeta)).toBe(true);
    expect(tallyCardsFilterMeta.length).toBe(1);
  });
});

