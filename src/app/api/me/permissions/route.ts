// src/app/api/me/permissions/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic"; // avoid static caching
export const revalidate = 0;

type RolePermissionRow = {
  permission_key: string | null;
  permissions: { key: string | null } | null;
};

type RoleRow = {
  role_permissions: RolePermissionRow[] | null;
};

type MePermissionsRow = {
  roles: RoleRow | RoleRow[] | null;
};

export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("users")
    .select(`
      roles:roles!fk_users_role_id (
        role_permissions:role_permissions!role_permissions_role_id_fkey (
          permission_key,
          permissions:permissions!role_permissions_permission_key_fkey ( key )
        )
      )
    `)
    .eq("auth_id", user.id)
    .maybeSingle<MePermissionsRow>();

  if (error) {
    return NextResponse.json({ error: "profile_query_failed" }, { status: 500 });
  }

  const permSet = new Set<string>();

  const roles = data?.roles;
  const roleList: RoleRow[] = Array.isArray(roles)
    ? roles
    : roles
      ? [roles]
      : [];

  for (const role of roleList) {
    const rps = role.role_permissions ?? [];
    for (const rp of rps) {
      const key = rp.permissions?.key ?? rp.permission_key ?? null;
      if (key) permSet.add(key);
    }
  }

  const res = NextResponse.json({ permissions: Array.from(permSet) });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
