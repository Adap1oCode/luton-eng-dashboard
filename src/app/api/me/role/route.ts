// src/app/api/me/role/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Type for the materialized view row */
type EffectivePermissionsRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role_id: string | null;
  role_code: string | null;
  role_name: string | null;
  role_family: string | null;
  permissions: string[]; // text[] from view
  permission_details: Array<{ key: string; description: string | null }>; // jsonb array
  warehouse_scope: Array<{ warehouse_code: string | null; warehouse_id: string | null; warehouse_name: string | null }>; // jsonb array
  default_homepage: string | null; // default homepage path
};

type MeRow = {
  id: string;                 // users.id (app user id)
  full_name: string | null;
  email: string | null;
  role_id: string | null;
  role_code: string | null;
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
  roleFamily: string | null; // role_family from roles table

  permissions: string[];
  permissionDetails: Array<{ key: string; description: string | null }>;

  /** Legacy alias (codes) */
  allowedWarehouses: string[];
  /** Enriched scoping (preferred) */
  allowedWarehouseCodes: string[];
  allowedWarehouseIds: string[];
  warehouseScope: Array<{ warehouse_id: string; warehouse_code: string; warehouse_name: string }>;
  defaultHomepage: string | null;
};

/** Build a "me" context from a users row using the materialized view */
async function buildContextForUserRow(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  me: MeRow,
  authUserIdFallback: string
): Promise<BuiltContext> {
  // Query the materialized view directly - replaces all complex joins
  const { data: viewRow, error: viewErr } = await supabase
    .from("mv_effective_permissions")
    .select("*")
    .eq("user_id", me.id)
    .maybeSingle<EffectivePermissionsRow>();

  if (viewErr) {
    throw new Error(`effective_permissions_query_failed: ${viewErr.message}`);
  }

  if (!viewRow) {
    // Fallback: user has no role/permissions (view returns null)
    return {
      userId: authUserIdFallback,
      appUserId: me.id,
      fullName: me.full_name ?? null,
      email: me.email ?? null,
      roleName: null,
      roleCode: me.role_code ?? null,
      roleFamily: null,
      permissions: [],
      permissionDetails: [],
      allowedWarehouses: [],
      allowedWarehouseCodes: [],
      allowedWarehouseIds: [],
      warehouseScope: [],
      defaultHomepage: null,
    };
  }

  // Extract warehouse codes, IDs, and names from warehouse_scope
  const warehouseScope = (viewRow.warehouse_scope ?? [])
    .map((w) => ({
      warehouse_id: w.warehouse_id ?? "",
      warehouse_code: w.warehouse_code ?? "",
      warehouse_name: w.warehouse_name ?? "",
    }))
    .filter((w): w is { warehouse_id: string; warehouse_code: string; warehouse_name: string } => 
      !!w.warehouse_id && !!w.warehouse_code
    );

  const allowedWarehouseCodes = warehouseScope.map((w) => w.warehouse_code);
  const allowedWarehouseIds = warehouseScope.map((w) => w.warehouse_id);

  const permList = viewRow.permissions ?? [];

  return {
    userId: authUserIdFallback,
    appUserId: me.id,
    fullName: viewRow.full_name ?? me.full_name ?? null,
    email: viewRow.email ?? me.email ?? null,
    roleName: viewRow.role_name ?? null,
    roleCode: viewRow.role_code ?? me.role_code ?? null,
    roleFamily: viewRow.role_family ?? null,
    permissions: permList,
    permissionDetails: viewRow.permission_details ?? [],
    allowedWarehouses: allowedWarehouseCodes,
    allowedWarehouseCodes,
    allowedWarehouseIds,
    warehouseScope,
    defaultHomepage: viewRow.default_homepage ?? null,
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

    // ENRICHED (preferred in new SessionContext)
    allowedWarehouseCodes: effectiveCtx.allowedWarehouseCodes,
    allowedWarehouseIds: effectiveCtx.allowedWarehouseIds,
    warehouseScope: effectiveCtx.warehouseScope,
    defaultHomepage: effectiveCtx.defaultHomepage,

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
      roleFamily: effectiveCtx.roleFamily,
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
