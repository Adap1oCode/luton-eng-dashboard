import { describe, it, expect } from "vitest";
import {
  assertRowInWarehouseScope,
  assertRowInOwnershipScope,
} from "./scope-guards";

describe("assertRowInWarehouseScope", () => {
  it("passes when row is in scope", () => {
    const row = { warehouse: "WH1" };
    const cfg = { mode: "column" as const, column: "warehouse" };
    const ctx = {
      canSeeAllWarehouses: false,
      allowedWarehouses: ["WH1", "WH2"],
    };
    expect(() => assertRowInWarehouseScope(row, cfg, ctx)).not.toThrow();
  });

  it("throws 403 when row is out of scope", () => {
    const row = { warehouse: "WH3" };
    const cfg = { mode: "column" as const, column: "warehouse" };
    const ctx = {
      canSeeAllWarehouses: false,
      allowedWarehouses: ["WH1", "WH2"],
    };
    expect(() => assertRowInWarehouseScope(row, cfg, ctx)).toThrow(
      "forbidden_out_of_scope_warehouse"
    );
    try {
      assertRowInWarehouseScope(row, cfg, ctx);
    } catch (err: any) {
      expect(err.status).toBe(403);
    }
  });

  it("bypasses when canSeeAllWarehouses=true and requireBinding=false", () => {
    const row = { warehouse: "WH3" };
    const cfg = { mode: "column" as const, column: "warehouse" };
    const ctx = {
      canSeeAllWarehouses: true,
      allowedWarehouses: [],
    };
    expect(() => assertRowInWarehouseScope(row, cfg, ctx)).not.toThrow();
  });

  it("bypasses when mode is 'none'", () => {
    const row = { warehouse: "WH3" };
    const cfg = { mode: "none" as const };
    const ctx = {
      canSeeAllWarehouses: false,
      allowedWarehouses: [],
    };
    expect(() => assertRowInWarehouseScope(row, cfg, ctx)).not.toThrow();
  });

  it("respects requireBinding flag", () => {
    const row = { warehouse: "WH3" };
    const cfg = {
      mode: "column" as const,
      column: "warehouse",
      requireBinding: true,
    };
    const ctx = {
      canSeeAllWarehouses: true,
      allowedWarehouses: ["WH1"],
    };
    expect(() => assertRowInWarehouseScope(row, cfg, ctx)).toThrow(
      "forbidden_out_of_scope_warehouse"
    );
  });

  it("throws when warehouse column is null/undefined", () => {
    const row1 = { warehouse: null };
    const row2 = { warehouse: undefined };
    const cfg = { mode: "column" as const, column: "warehouse" };
    const ctx = {
      canSeeAllWarehouses: false,
      allowedWarehouses: ["WH1"],
    };
    expect(() => assertRowInWarehouseScope(row1, cfg, ctx)).toThrow();
    expect(() => assertRowInWarehouseScope(row2, cfg, ctx)).toThrow();
  });

  it("handles empty allowedWarehouses", () => {
    const row = { warehouse: "WH1" };
    const cfg = { mode: "column" as const, column: "warehouse" };
    const ctx = {
      canSeeAllWarehouses: false,
      allowedWarehouses: [],
    };
    expect(() => assertRowInWarehouseScope(row, cfg, ctx)).toThrow();
  });
});

describe("assertRowInOwnershipScope", () => {
  it("passes when owner matches", () => {
    const row = { user_id: "user1" };
    const cfg = { mode: "self" as const, column: "user_id" };
    const ctx = { userId: "user1", permissions: [] };
    expect(() => assertRowInOwnershipScope(row, cfg, ctx)).not.toThrow();
  });

  it("throws 403 when owner mismatch", () => {
    const row = { user_id: "user2" };
    const cfg = { mode: "self" as const, column: "user_id" };
    const ctx = { userId: "user1", permissions: [] };
    expect(() => assertRowInOwnershipScope(row, cfg, ctx)).toThrow(
      "forbidden_out_of_scope_owner"
    );
    try {
      assertRowInOwnershipScope(row, cfg, ctx);
    } catch (err: any) {
      expect(err.status).toBe(403);
    }
  });

  it("bypasses when bypass permission present", () => {
    const row = { user_id: "user2" };
    const cfg = {
      mode: "self" as const,
      column: "user_id",
      bypassPermissions: ["admin:read:any"],
    };
    const ctx = {
      userId: "user1",
      permissions: ["admin:read:any"],
    };
    expect(() => assertRowInOwnershipScope(row, cfg, ctx)).not.toThrow();
  });

  it("applies filter when bypass permission not in permissions", () => {
    const row = { user_id: "user2" };
    const cfg = {
      mode: "self" as const,
      column: "user_id",
      bypassPermissions: ["admin:read:any"],
    };
    const ctx = {
      userId: "user1",
      permissions: ["other:permission"],
    };
    expect(() => assertRowInOwnershipScope(row, cfg, ctx)).toThrow();
  });

  it("bypasses when mode is not 'self'", () => {
    const row = { user_id: "user2" };
    const cfg = undefined;
    const ctx = { userId: "user1", permissions: [] };
    expect(() => assertRowInOwnershipScope(row, cfg, ctx)).not.toThrow();
  });

  it("throws when owner column is null/undefined", () => {
    const row1 = { user_id: null };
    const row2 = { user_id: undefined };
    const cfg = { mode: "self" as const, column: "user_id" };
    const ctx = { userId: "user1", permissions: [] };
    expect(() => assertRowInOwnershipScope(row1, cfg, ctx)).toThrow();
    expect(() => assertRowInOwnershipScope(row2, cfg, ctx)).toThrow();
  });

  it("handles multiple bypass permissions", () => {
    const row = { user_id: "user2" };
    const cfg = {
      mode: "self" as const,
      column: "user_id",
      bypassPermissions: ["admin:read:any", "entries:read:any"],
    };
    const ctx = {
      userId: "user1",
      permissions: ["entries:read:any"],
    };
    expect(() => assertRowInOwnershipScope(row, cfg, ctx)).not.toThrow();
  });
});

























