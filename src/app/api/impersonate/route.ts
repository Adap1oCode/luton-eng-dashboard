import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const COOKIE = "impersonate_user_id";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user: auth } } = await supabase.auth.getUser();
  if (!auth) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "missing_userId" }, { status: 400 });

  // gate with admin:impersonate
  const { data: me } = await supabase
    .from("users")
    .select("id, role_id")
    .eq("auth_id", auth.id)
    .maybeSingle();

  const { data: perms } = await supabase
    .from("role_permissions")
    .select("permission_key")
    .eq("role_id", me?.role_id ?? "");

  const canImpersonate = (perms ?? []).some(p => p.permission_key === "admin:impersonate");
  if (!canImpersonate) return NextResponse.json({ error: "forbidden" }, { status: 403 });

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
