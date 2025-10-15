// src/app/api/me/role/route.ts
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RolePermissionRow = {
  permission_key: string | null;
  permissions: { key: string | null; description: string | null } | null;
};

type RoleRow = {
  role_name: string | null;
  role_code: string | null;
  role_permissions: RolePermissionRow[] | null;
};

// Note: roles may be a single object or an array depending on the join behavior
type MeRow = {
  full_name: string | null;
  email: string | null;
  role_code: string | null;
  role_id: string | null;
  roles: RoleRow | RoleRow[] | null;
};

export async function GET() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // FK-qualified relations to force object for roles and array for role_permissions
  const { data: prof, error } = await supabase
    .from("users")
    .select(
      `
      full_name,
      email,
      role_code,
      role_id,
      roles:roles!fk_users_role_id (
        role_name,
        role_code,
        role_permissions:role_permissions!role_permissions_role_id_fkey (
          permission_key,
          permissions:permissions!role_permissions_permission_key_fkey (
            key,
            description
          )
        )
      )
    `,
    )
    .eq("auth_id", user.id)
    .maybeSingle<MeRow>();

  if (error) {
    return NextResponse.json({ error: "profile_query_failed" }, { status: 500 });
  }

  // Normalize roles to an array, then take the first for roleName/roleCode
  const roles = prof?.roles;
  const roleList: RoleRow[] = Array.isArray(roles) ? roles : roles ? [roles] : [];
  const role = roleList[0] ?? null;

  const roleName = role?.role_name ?? null;
  const roleCode = role?.role_code ?? prof?.role_code ?? null;

  // Flatten permissions: prefer canonical permissions.key; fallback to role_permissions.permission_key
  const permSet = new Set<string>();
  const details: Array<{ key: string; description: string | null }> = [];

  for (const r of roleList) {
    const rps = r.role_permissions ?? [];
    for (const rp of rps) {
      const key = rp.permissions?.key ?? rp.permission_key ?? undefined;
      if (key) {
        permSet.add(key);
        details.push({
          key,
          description: rp.permissions?.description ?? null,
        });
      }
    }
  }

  return NextResponse.json(
    {
      userId: user.id,
      fullName: prof?.full_name ?? null,
      email: prof?.email ?? user.email ?? null,
      roleName,
      roleCode,
      avatarUrl: null, // wire users.avatar_url later
      permissions: Array.from(permSet), // compact array for gating
      permissionDetails: details, // optional: richer info for a settings screen
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
