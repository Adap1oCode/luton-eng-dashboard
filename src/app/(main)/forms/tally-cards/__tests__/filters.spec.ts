import { describe, it, expect } from "vitest";
import { tallyCardsFilterMeta } from "../tally-cards.config";

describe("tallyCardsFilterMeta", () => {
  it("has status and updated quick filters configured", () => {
    // Tally cards have status filter (Active/Inactive) and updated filter
    expect(tallyCardsFilterMeta).toHaveLength(2);
    expect(tallyCardsFilterMeta[0].id).toBe("status");
    expect(tallyCardsFilterMeta[1].id).toBe("updated");
    expect(typeof tallyCardsFilterMeta[0].toQueryParam).toBe("function");
    expect(typeof tallyCardsFilterMeta[1].toQueryParam).toBe("function");
  });

  it("is an array with status and updated filters", () => {
    expect(Array.isArray(tallyCardsFilterMeta)).toBe(true);
    expect(tallyCardsFilterMeta.length).toBe(2);
  });
});

