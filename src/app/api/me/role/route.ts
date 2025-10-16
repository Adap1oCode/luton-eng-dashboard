// src/app/api/me/role/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RoleRow = {
  id: string;
  role_name: string | null;
  role_code: string | null;
};

type MeRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role_id: string | null;
  role_code: string | null;
};

// NOTE: Supabase/PostgREST may surface embedded rows as object OR array.
// Make the type tolerant, then normalize at runtime.
type PermissionObj = { key: string | null; description: string | null } | null;
type RolePermissionJoined =
  | {
      permission_key: string | null;
      permissions: PermissionObj;
    }
  | {
      permission_key: string | null;
      permissions: PermissionObj[]; // sometimes comes back as an array
    };

type WarehouseRuleRow = {
  warehouse: string | null; // text code
  warehouse_id: string | null; // uuid
};

export async function GET() {
  const supabase = await supabaseServer();

  // Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // 1) App user record (role_id / role_code live here)
  const { data: me, error: meErr } = await supabase
    .from("users")
    .select("id, full_name, email, role_id, role_code")
    .eq("auth_id", user.id)
    .maybeSingle<MeRow>();

  if (meErr) {
    return NextResponse.json(
      { error: "profile_query_failed", details: meErr.message },
      { status: 500 },
    );
  }
  if (!me) {
    return NextResponse.json(
      { error: "no_profile_row_for_auth_user" },
      { status: 404 },
    );
  }

  const roleId = me.role_id;

  // 2) Canonical role (name/code)
  let role: RoleRow | null = null;
  if (roleId) {
    const { data: roleRow, error: roleErr } = await supabase
      .from("roles")
      .select("id, role_name, role_code")
      .eq("id", roleId)
      .maybeSingle<RoleRow>();

    if (roleErr) {
      return NextResponse.json(
        { error: "role_query_failed", details: roleErr.message },
        { status: 500 },
      );
    }
    role = roleRow ?? null;
  }

  // 3) Permissions via explicit FK alias to `permissions`
  const permSet = new Set<string>();
  const permissionDetails: Array<{ key: string; description: string | null }> = [];

  if (roleId) {
    const { data: rpRows, error: rpErr } = await supabase
      .from("role_permissions")
      .select(
        `
        permission_key,
        permissions:permissions!role_permissions_permission_key_fkey (
          key, description
        )
      `,
      )
      .eq("role_id", roleId);

    if (rpErr) {
      return NextResponse.json(
        { error: "role_permissions_query_failed", details: rpErr.message },
        { status: 500 },
      );
    }

    // Normalize object|array -> object
    const toPermissionObj = (p: PermissionObj | PermissionObj[] | undefined): PermissionObj => {
      if (!p) return null;
      return Array.isArray(p) ? (p[0] ?? null) : p;
    };

    for (const rp of (rpRows ?? []) as RolePermissionJoined[]) {
      const perm = toPermissionObj((rp as any).permissions);
      const k = perm?.key ?? (rp as any).permission_key ?? null;
      if (k) {
        permSet.add(k);
        permissionDetails.push({
          key: k,
          description: perm?.description ?? null,
        });
      }
    }
  }

  // 4) Warehouse scope (defined per role in role_warehouse_rules)
  let allowedWarehouses: string[] = [];
  if (roleId) {
    const { data: wrRows, error: wrErr } = await supabase
      .from("role_warehouse_rules")
      .select("warehouse, warehouse_id")
      .eq("role_id", roleId);

    if (wrErr) {
      return NextResponse.json(
        { error: "warehouse_rules_query_failed", details: wrErr.message },
        { status: 500 },
      );
    }

    allowedWarehouses = (wrRows ?? [])
      .map((r: WarehouseRuleRow) => r.warehouse)
      .filter((w): w is string => !!w);
  }

  // Rule: if no rows => ALL warehouses (or role implies global)
  const roleCode: string | null = role?.role_code ?? me.role_code ?? null;
  const roleImpliesAll =
    roleCode ? ["inventory_manager", "admin"].includes(roleCode) : false;
  const canSeeAllWarehouses = roleImpliesAll || allowedWarehouses.length === 0;

  // Response
  return NextResponse.json(
    {
      userId: user.id,
      fullName: me.full_name ?? null,
      email: me.email ?? user.email ?? null,
      roleName: role?.role_name ?? null,
      roleCode,
      avatarUrl: null,
      permissions: Array.from(permSet),
      permissionDetails,
      allowedWarehouses, // [] + canSeeAllWarehouses=true => global access
      canSeeAllWarehouses,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
