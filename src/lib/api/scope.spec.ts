import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  applyWarehouseScopeToSupabase,
  applyOwnershipScopeToSupabase,
} from "./scope";

// Mock FilterableQB type
type MockQB = {
  in: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
};

function createMockQB(): MockQB {
  const mockIn = vi.fn();
  const mockEq = vi.fn();
  mockIn.mockReturnValue({ in: mockIn, eq: mockEq });
  mockEq.mockReturnValue({ in: mockIn, eq: mockEq });
  return { in: mockIn, eq: mockEq };
}

let mockQB: MockQB;

describe("applyWarehouseScopeToSupabase", () => {
  beforeEach(() => {
    mockQB = createMockQB();
  });

  it("bypasses when mode is 'none'", () => {
    const cfg = { mode: "none" as const };
    const ctx = { canSeeAllWarehouses: false, allowedWarehouses: ["WH1"] };
    const result = applyWarehouseScopeToSupabase(mockQB, cfg, ctx);
    expect(result).toBe(mockQB);
    expect(mockQB.in).not.toHaveBeenCalled();
    expect(mockQB.eq).not.toHaveBeenCalled();
  });

  it("bypasses when canSeeAllWarehouses=true and requireBinding=false", () => {
    const cfg = { mode: "column" as const, column: "warehouse" };
    const ctx = { canSeeAllWarehouses: true, allowedWarehouses: [] };
    const result = applyWarehouseScopeToSupabase(mockQB, cfg, ctx);
    expect(result).toBe(mockQB);
    expect(mockQB.in).not.toHaveBeenCalled();
  });

  it("applies filter when canSeeAllWarehouses=false", () => {
    const cfg = { mode: "column" as const, column: "warehouse" };
    const ctx = {
      canSeeAllWarehouses: false,
      allowedWarehouses: ["WH1", "WH2"],
    };
    applyWarehouseScopeToSupabase(mockQB, cfg, ctx);
    expect(mockQB.in).toHaveBeenCalledWith("warehouse", ["WH1", "WH2"]);
  });

  it("uses IDs when column ends with _id", () => {
    const cfg = { mode: "column" as const, column: "warehouse_id" };
    const ctx = {
      canSeeAllWarehouses: false,
      allowedWarehouseIds: ["uuid1", "uuid2"],
      allowedWarehouseCodes: ["WH1"],
    };
    applyWarehouseScopeToSupabase(mockQB, cfg, ctx);
    expect(mockQB.in).toHaveBeenCalledWith("warehouse_id", ["uuid1", "uuid2"]);
  });

  it("uses codes when column does not end with _id", () => {
    const cfg = { mode: "column" as const, column: "warehouse" };
    const ctx = {
      canSeeAllWarehouses: false,
      allowedWarehouseIds: ["uuid1"],
      allowedWarehouseCodes: ["WH1", "WH2"],
    };
    applyWarehouseScopeToSupabase(mockQB, cfg, ctx);
    expect(mockQB.in).toHaveBeenCalledWith("warehouse", ["WH1", "WH2"]);
  });

  it("falls back to legacy allowedWarehouses when codes not provided", () => {
    const cfg = { mode: "column" as const, column: "warehouse" };
    const ctx = {
      canSeeAllWarehouses: false,
      allowedWarehouses: ["WH1"],
    };
    applyWarehouseScopeToSupabase(mockQB, cfg, ctx);
    expect(mockQB.in).toHaveBeenCalledWith("warehouse", ["WH1"]);
  });

  it("returns empty filter when no bindings", () => {
    const cfg = { mode: "column" as const, column: "warehouse" };
    const ctx = {
      canSeeAllWarehouses: false,
      allowedWarehouses: [],
      allowedWarehouseCodes: [],
      allowedWarehouseIds: [],
    };
    applyWarehouseScopeToSupabase(mockQB, cfg, ctx);
    expect(mockQB.in).toHaveBeenCalledWith("warehouse", [
      "__NO_ALLOWED_WAREHOUSES__",
    ]);
  });

  it("respects requireBinding flag", () => {
    const cfg = {
      mode: "column" as const,
      column: "warehouse",
      requireBinding: true,
    };
    const ctx = {
      canSeeAllWarehouses: true,
      allowedWarehouses: ["WH1"],
    };
    applyWarehouseScopeToSupabase(mockQB, cfg, ctx);
    expect(mockQB.in).toHaveBeenCalledWith("warehouse", ["WH1"]);
  });
});

describe("applyOwnershipScopeToSupabase", () => {
  beforeEach(() => {
    mockQB = createMockQB();
  });

  it("bypasses when cfg is undefined", () => {
    const cfg = undefined;
    const ctx = { userId: "user1", permissions: [] };
    const result = applyOwnershipScopeToSupabase(mockQB, cfg, ctx);
    expect(result).toBe(mockQB);
    expect(mockQB.eq).not.toHaveBeenCalled();
  });

  it("bypasses when bypass permission present", () => {
    const cfg = {
      mode: "self" as const,
      column: "user_id",
      bypassPermissions: ["admin:read:any"],
    };
    const ctx = {
      userId: "user1",
      permissions: ["admin:read:any"],
    };
    const result = applyOwnershipScopeToSupabase(mockQB, cfg, ctx);
    expect(result).toBe(mockQB);
    expect(mockQB.eq).not.toHaveBeenCalled();
  });

  it("applies filter when no bypass", () => {
    const cfg = { mode: "self" as const, column: "user_id" };
    const ctx = { userId: "user1", permissions: [] };
    applyOwnershipScopeToSupabase(mockQB, cfg, ctx);
    expect(mockQB.eq).toHaveBeenCalledWith("user_id", "user1");
  });

  it("applies filter when bypass permission not in permissions", () => {
    const cfg = {
      mode: "self" as const,
      column: "user_id",
      bypassPermissions: ["admin:read:any"],
    };
    const ctx = { userId: "user1", permissions: ["other:permission"] };
    applyOwnershipScopeToSupabase(mockQB, cfg, ctx);
    expect(mockQB.eq).toHaveBeenCalledWith("user_id", "user1");
  });

  it("handles multiple bypass permissions", () => {
    const cfg = {
      mode: "self" as const,
      column: "user_id",
      bypassPermissions: ["admin:read:any", "entries:read:any"],
    };
    const ctx = {
      userId: "user1",
      permissions: ["entries:read:any"],
    };
    const result = applyOwnershipScopeToSupabase(mockQB, cfg, ctx);
    expect(result).toBe(mockQB);
    expect(mockQB.eq).not.toHaveBeenCalled();
  });

  describe("role_family mode", () => {
    it("applies filter when roleFamily is provided", () => {
      const cfg = { mode: "role_family" as const, column: "role_family" };
      const ctx = { userId: "user1", permissions: [], roleFamily: "STORE_OFFICER" };
      applyOwnershipScopeToSupabase(mockQB, cfg, ctx);
      expect(mockQB.eq).toHaveBeenCalledWith("role_family", "STORE_OFFICER");
    });

    it("returns empty filter when roleFamily is null", () => {
      const cfg = { mode: "role_family" as const, column: "role_family" };
      const ctx = { userId: "user1", permissions: [], roleFamily: null };
      applyOwnershipScopeToSupabase(mockQB, cfg, ctx);
      expect(mockQB.eq).toHaveBeenCalledWith("role_family", "__NO_ROLE_FAMILY__");
    });

    it("returns empty filter when roleFamily is undefined", () => {
      const cfg = { mode: "role_family" as const, column: "role_family" };
      const ctx = { userId: "user1", permissions: [] };
      applyOwnershipScopeToSupabase(mockQB, cfg, ctx);
      expect(mockQB.eq).toHaveBeenCalledWith("role_family", "__NO_ROLE_FAMILY__");
    });

    it("bypasses when bypass permission present", () => {
      const cfg = {
        mode: "role_family" as const,
        column: "role_family",
        bypassPermissions: ["admin:read:any"],
      };
      const ctx = {
        userId: "user1",
        permissions: ["admin:read:any"],
        roleFamily: "STORE_OFFICER",
      };
      const result = applyOwnershipScopeToSupabase(mockQB, cfg, ctx);
      expect(result).toBe(mockQB);
      expect(mockQB.eq).not.toHaveBeenCalled();
    });
  });
});

