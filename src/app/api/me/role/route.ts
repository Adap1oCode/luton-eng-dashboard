// src/app/api/me/role/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** DB row types (adjust column names here if your schema differs) */
type RoleRow = {
  id: string;
  role_name: string | null;
  role_code: string | null;
};

type MeRow = {
  id: string;                 // users.id (app user id)
  full_name: string | null;
  email: string | null;
  role_id: string | null;
  role_code: string | null;
};

type PermissionObj = { key: string | null; description: string | null } | null;
type RolePermissionJoined =
  | { permission_key: string | null; permissions: PermissionObj }
  | { permission_key: string | null; permissions: PermissionObj[] };

type WarehouseRuleRow = {
  warehouse: string | null;    // code (e.g. "RTZ")
  warehouse_id: string | null; // uuid
};

/** Context we build for a user */
type BuiltContext = {
  /** Keep as auth id at top-level for compatibility */
  userId: string;         // Supabase auth user id (real auth when impersonating)
  appUserId: string;      // users.id (app user id)

  fullName: string | null;
  email: string | null;
  roleName: string | null;
  roleCode: string | null;

  permissions: string[];
  permissionDetails: Array<{ key: string; description: string | null }>;

  /** Legacy alias (codes) */
  allowedWarehouses: string[];
  /** Enriched scoping (preferred) */
  allowedWarehouseCodes: string[];
  allowedWarehouseIds: string[];
  canSeeAllWarehouses: boolean;
};

/** Normalize polymorphic join result */
function normalizePermission(p: PermissionObj | PermissionObj[] | undefined): PermissionObj {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

/** Build a “me” context from a users row */
async function buildContextForUserRow(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  me: MeRow,
  authUserIdFallback: string
): Promise<BuiltContext> {
  const roleId = me.role_id;

  // 1) Role (by id if present)
  let role: RoleRow | null = null;
  if (roleId) {
    const { data: roleRow, error: roleErr } = await supabase
      .from("roles")
      .select("id, role_name, role_code")
      .eq("id", roleId)
      .maybeSingle<RoleRow>();
    if (roleErr) throw new Error(`role_query_failed: ${roleErr.message}`);
    role = roleRow ?? null;
  }

  // —— Derive final roleName / roleCode with safe fallbacks ——
  // Prefer explicit role row, else fallback to user's stored role_code
  let roleName: string | null = role?.role_name ?? null;
  let roleCodeOut: string | null = role?.role_code ?? me.role_code ?? null;

  // If role_id is null but we have a role_code, resolve a display name by code.
  if (!roleName && roleCodeOut) {
    const { data: byCode, error: byCodeErr } = await supabase
      .from("roles")
      .select("role_name, role_code")
      .eq("role_code", roleCodeOut)
      .maybeSingle<{ role_name: string | null; role_code: string | null }>();
    if (!byCodeErr && byCode) {
      roleName = byCode.role_name ?? roleName;
      roleCodeOut = byCode.role_code ?? roleCodeOut;
    }
  }
  // ————————————————————————————————————————————————————————————————

  // 2) Permissions (flatten)
  const permSet = new Set<string>();
  const permissionDetails: Array<{ key: string; description: string | null }> = [];
  if (roleId) {
    const { data: rpRows, error: rpErr } = await supabase
      .from("role_permissions")
      .select(`
        permission_key,
        permissions:permissions!role_permissions_permission_key_fkey ( key, description )
      `)
      .eq("role_id", roleId);

    if (rpErr) throw new Error(`role_permissions_query_failed: ${rpErr.message}`);

    for (const rp of (rpRows ?? []) as RolePermissionJoined[]) {
      const perm = normalizePermission((rp as any).permissions);
      const k = (perm?.key ?? (rp as any).permission_key ?? null) as string | null;
      if (k) {
        permSet.add(k);
        permissionDetails.push({ key: k, description: perm?.description ?? null });
      }
    }
  }

  // 3) Warehouse scope: collect BOTH codes and ids
  let allowedWarehouseCodes: string[] = [];
  let allowedWarehouseIds: string[] = [];

  if (roleId) {
    const { data: wrRows, error: wrErr } = await supabase
      .from("role_warehouse_rules")
      .select("warehouse, warehouse_id")
      .eq("role_id", roleId);
    if (wrErr) throw new Error(`warehouse_rules_query_failed: ${wrErr.message}`);

    const rows = (wrRows ?? []) as WarehouseRuleRow[];

    allowedWarehouseCodes = rows
      .map((r) => r.warehouse)
      .filter((w): w is string => !!w);

    allowedWarehouseIds = rows
      .map((r) => r.warehouse_id)
      .filter((id): id is string => !!id);
  }

  // Policy: if explicit rules absent, deny-by-default (no global). If your policy is different,
  // tweak this. Here we grant "global" only if a permission implies it.
  const permList = Array.from(permSet);
  const roleImpliesAll = false; // strict
  const hasGlobalPerm =
    permList.includes("entries:read:any") || permList.includes("admin:read:any");
  const canSeeAllWarehouses = hasGlobalPerm || roleImpliesAll;

  return {
    userId: authUserIdFallback,
    appUserId: me.id,
    fullName: me.full_name ?? null,
    email: me.email ?? null,
    roleName,
    roleCode: roleCodeOut,

    permissions: permList,
    permissionDetails,

    // Back-compat (alias) – codes
    allowedWarehouses: allowedWarehouseCodes,

    // Enriched (preferred)
    allowedWarehouseCodes,
    allowedWarehouseIds,
    canSeeAllWarehouses,
  };
}

export async function GET(req: NextRequest) {
  const supabase = await supabaseServer();

  // Real caller (Supabase auth)
  const {
    data: { user: realAuthUser },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr) {
    return NextResponse.json({ error: authErr.message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  if (!realAuthUser) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  // Read impersonation from query, header, or cookie (Next 15: cookies()/headers() are async)
  const url = new URL(req.url);
  const qImpersonate = url.searchParams.get("impersonate");
  const hdrs = await headers();
  const hImpersonate = hdrs.get("x-impersonate-user-id");
  const cookieStore = await cookies();
  const cImpersonate = cookieStore.get("impersonate_user_id")?.value ?? null;
  const requestedImpersonateId = (qImpersonate || hImpersonate || cImpersonate || "").trim() || null;

  // Real app user
  const { data: realMe, error: realMeErr } = await supabase
    .from("users")
    .select("id, full_name, email, role_id, role_code")
    .eq("auth_id", realAuthUser.id)
    .maybeSingle<MeRow>();
  if (realMeErr) {
    return NextResponse.json(
      { error: "profile_query_failed", details: realMeErr.message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (!realMe) {
    return NextResponse.json(
      { error: "no_profile_row_for_auth_user" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Build real context (for permission gating)
  let realCtx: BuiltContext;
  try {
    realCtx = await buildContextForUserRow(supabase, realMe, realAuthUser.id);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "context_build_failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Decide effective context (impersonate if allowed)
  let effectiveCtx: BuiltContext = realCtx;
  let impersonating = false;
  let impersonationDenied: string | null = null;
  let targetAppUser: MeRow | null = null;

  if (requestedImpersonateId) {
    const canImpersonate = realCtx.permissions.includes("admin:impersonate");
    if (!canImpersonate) {
      impersonationDenied = "missing_permission_admin:impersonate";
      console.info(
        `[IMPERSONATION][DENIED] ${realCtx.email ?? realAuthUser.email} -> ${requestedImpersonateId} (${impersonationDenied})`
      );
    } else {
      // Use SECURITY DEFINER RPC to fetch target user (bypasses RLS safely)
      const { data: tRows, error: tErr } = await supabase.rpc("admin_get_user", {
        p_user_id: requestedImpersonateId,
      });

      if (tErr || !tRows || !tRows[0]) {
        impersonationDenied = tErr ? `target_lookup_failed: ${tErr.message}` : "target_not_found";
        console.info(
          `[IMPERSONATION][DENIED] ${realCtx.email ?? realAuthUser.email} -> ${requestedImpersonateId} (${impersonationDenied})`
        );
      } else {
        const tUser = tRows[0] as MeRow;
        targetAppUser = tUser;
        try {
          const targetCtx = await buildContextForUserRow(supabase, tUser, realAuthUser.id);
          effectiveCtx = {
            ...targetCtx,
            // Keep top-level userId as the REAL auth id (back-compat with callers)
            userId: realAuthUser.id,
          };
          impersonating = true;
          console.info(
            `[IMPERSONATION] ${realCtx.email ?? realAuthUser.email} is impersonating ${targetCtx.email} (users.id=${tUser.id})`
          );
        } catch (e: any) {
          impersonationDenied = e?.message ?? "target_context_build_failed";
          console.info(
            `[IMPERSONATION][DENIED] ${realCtx.email ?? realAuthUser.email} -> ${requestedImpersonateId} (${impersonationDenied})`
          );
        }
      }
    }
  }

  const nowIso = new Date().toISOString();

  // Build response:
  // - Keep your legacy top-level fields for compatibility.
  // - Add enriched fields for the new SessionContext (allowedWarehouseCodes / Ids).
  // - Provide top-level realUser / effectiveUser (for set-session-context.ts),
  //   and also keep them nested under meta for any older consumers.
  const responseBody = {
    // EFFECTIVE (impersonated or real) – legacy top-level fields
    userId: effectiveCtx.userId,
    fullName: effectiveCtx.fullName,
    email: effectiveCtx.email,
    roleName: effectiveCtx.roleName,
    roleCode: effectiveCtx.roleCode,
    avatarUrl: null,
    permissions: effectiveCtx.permissions,
    permissionDetails: effectiveCtx.permissionDetails,
    allowedWarehouses: effectiveCtx.allowedWarehouses,
    canSeeAllWarehouses: effectiveCtx.canSeeAllWarehouses,

    // ENRICHED (preferred in new SessionContext)
    allowedWarehouseCodes: effectiveCtx.allowedWarehouseCodes,
    allowedWarehouseIds: effectiveCtx.allowedWarehouseIds,

    // Top-level users for new SessionContext
    realUser: {
      authUserId: realAuthUser.id,
      appUserId: realCtx.appUserId,
      fullName: realCtx.fullName,
      email: realCtx.email,
      roleName: realCtx.roleName,
      roleCode: realCtx.roleCode,
    },
    effectiveUser: {
      appUserId: effectiveCtx.appUserId,
      fullName: effectiveCtx.fullName,
      email: effectiveCtx.email,
      roleName: effectiveCtx.roleName,
      roleCode: effectiveCtx.roleCode,
      permissions: effectiveCtx.permissions,
    },

    // Keep meta block for any existing consumers
    meta: {
      impersonating,
      startedAt: impersonating ? nowIso : null,
      denial: impersonationDenied,
      requestedImpersonateId,
      realUser: {
        authUserId: realAuthUser.id,
        appUserId: realCtx.appUserId,
        fullName: realCtx.fullName,
        email: realCtx.email,
        roleName: realCtx.roleName,
        roleCode: realCtx.roleCode,
        permissions: realCtx.permissions,
      },
      effectiveUser: {
        appUserId: effectiveCtx.appUserId,
        fullName: effectiveCtx.fullName,
        email: effectiveCtx.email,
        roleName: effectiveCtx.roleName,
        roleCode: effectiveCtx.roleCode,
        permissions: effectiveCtx.permissions,
      },
    },
  };

  return NextResponse.json(responseBody, {
    headers: { "Cache-Control": "no-store" },
  });
}
