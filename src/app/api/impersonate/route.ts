import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const COOKIE = "impersonate_user_id";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user: auth } } = await supabase.auth.getUser();
  if (!auth) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "missing_userId" }, { status: 400 });

  // Get the real user's app user id
  const { data: me } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", auth.id)
    .maybeSingle();

  if (!me) {
    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  }

  // Check permissions from the materialized view
  // Allow if user has admin:impersonate permission OR is ADMINISTRATOR role
  const { data: viewRow } = await supabase
    .from("mv_effective_permissions")
    .select("permissions, role_code")
    .eq("user_id", me.id)
    .maybeSingle<{ permissions: string[]; role_code: string | null }>();

  const hasImpersonatePermission = (viewRow?.permissions ?? []).includes("admin:impersonate");
  const isAdministrator = viewRow?.role_code === "ADMINISTRATOR";
  const canImpersonate = hasImpersonatePermission || isAdministrator;
  
  if (!canImpersonate) {
    return NextResponse.json({ 
      error: "forbidden",
      message: "You do not have permission to impersonate users. Administrator role or admin:impersonate permission required."
    }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("impersonate_user_id", "", { path: "/", maxAge: 0 });
  return res;
}
