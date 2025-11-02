import { describe, it, expect } from "vitest";

/**
 * Serialize filters for stable queryKey.
 * This matches the logic in resource-list-client.tsx
 */
function serializeFilters(filters: Record<string, string>): string {
  const keys = Object.keys(filters).sort(); // Sort for stability
  return keys.map(key => `${encodeURIComponent(key)}:${encodeURIComponent(filters[key])}`).join('|');
}

describe("queryKey serialization", () => {
  it("serializes empty filters to empty string (handled as 'no-filters' in actual usage)", () => {
    const filters = {};
    const result = serializeFilters(filters);
    
    expect(result).toBe("");
  });

  it("serializes single filter", () => {
    const filters = { status: "ACTIVE" };
    const result = serializeFilters(filters);
    
    expect(result).toBe("status:ACTIVE");
  });

  it("produces same string for identical filters with different key order", () => {
    const filters1 = { status: "ACTIVE", type: "adjustment" };
    const filters2 = { type: "adjustment", status: "ACTIVE" };
    
    const result1 = serializeFilters(filters1);
    const result2 = serializeFilters(filters2);
    
    expect(result1).toBe(result2);
    expect(result1).toBe("status:ACTIVE|type:adjustment");
  });

  it("encodes values containing : (colon)", () => {
    const filters = { status: "ACTIVE:ALL" };
    const result = serializeFilters(filters);
    
    expect(result).toBe("status:ACTIVE%3AALL");
    // The separator colon is expected, but the value colon should be encoded
    expect(result.split(":")[1]).toBe("ACTIVE%3AALL");
    expect(decodeURIComponent("ACTIVE%3AALL")).toBe("ACTIVE:ALL");
  });

  it("encodes values containing | (pipe)", () => {
    const filters = { status: "ACTIVE|ZERO" };
    const result = serializeFilters(filters);
    
    expect(result).toBe("status:ACTIVE%7CZERO");
    expect(result.split("|")).toHaveLength(1); // No pipe in result
    expect(decodeURIComponent("ACTIVE%7CZERO")).toBe("ACTIVE|ZERO");
  });

  it("encodes keys containing special characters", () => {
    const filters = { "status:type": "ACTIVE" };
    const result = serializeFilters(filters);
    
    expect(result).toBe("status%3Atype:ACTIVE");
    expect(decodeURIComponent("status%3Atype")).toBe("status:type");
  });

  it("handles multiple filters with special characters", () => {
    const filters = {
      "filter:name": "value:with|pipes",
      status: "ACTIVE:ALL"
    };
    const result = serializeFilters(filters);
    
    // Should be sorted by key
    expect(result).toContain("filter%3Aname");
    expect(result).toContain("status");
    expect(result.split("|")).toHaveLength(2);
  });

  it("maintains uniqueness for different filter values", () => {
    const filters1 = { status: "ACTIVE" };
    const filters2 = { status: "ZERO" };
    
    const result1 = serializeFilters(filters1);
    const result2 = serializeFilters(filters2);
    
    expect(result1).not.toBe(result2);
    expect(result1).toBe("status:ACTIVE");
    expect(result2).toBe("status:ZERO");
  });

  it("handles empty string values", () => {
    const filters = { status: "" };
    const result = serializeFilters(filters);
    
    expect(result).toBe("status:");
  });
});

