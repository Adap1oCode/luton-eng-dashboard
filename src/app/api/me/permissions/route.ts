import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic"; // avoid static caching
export const revalidate = 0;

type EffectivePermissionsRow = {
  permissions: string[];
};

export async function GET(_req: NextRequest) {
  const supabase = await supabaseServer();

  // Real auth user
  const {
    data: { user: realAuth },
  } = await supabase.auth.getUser();
  if (!realAuth) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  // Read impersonation (match /api/me/role)
  const h = await headers();
  const qImpersonate = null; // permissions route uses cookie/header only
  const hImpersonate = h.get("x-impersonate-user-id");
  const cImpersonate = (await cookies()).get("impersonate_user_id")?.value ?? null;
  const requestedImpersonateId = (qImpersonate || hImpersonate || cImpersonate || "").trim() || null;

  // Resolve the effective app user id (users.id)
  let effectiveAppUserId: string | null = null;

  if (requestedImpersonateId) {
    // Use SECURITY DEFINER RPC (same approach as /api/me/role)
    const { data: tRows, error: tErr } = await supabase.rpc("admin_get_user", {
      p_user_id: requestedImpersonateId,
    });
    if (!tErr && tRows?.[0]?.id) {
      effectiveAppUserId = tRows[0].id as string;
    }
  }

  if (!effectiveAppUserId) {
    // Fallback to real user's app row
    const { data: meRow, error: meErr } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", realAuth.id)
      .maybeSingle<{ id: string }>();
    if (meErr || !meRow) {
      return NextResponse.json({ error: "profile_query_failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }
    effectiveAppUserId = meRow.id;
  }

  // Query the materialized view
  const { data: viewRow, error: viewErr } = await supabase
    .from("mv_effective_permissions")
    .select("permissions")
    .eq("user_id", effectiveAppUserId)
    .maybeSingle<EffectivePermissionsRow>();

  if (viewErr) {
    return NextResponse.json({ error: "permissions_query_failed", details: viewErr.message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  const permissions = viewRow?.permissions ?? [];

  const res = NextResponse.json({ permissions });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
