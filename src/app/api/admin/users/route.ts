import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UserLite = { id: string; full_name: string | null; email: string | null };

export async function GET() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // No generic on rpc(); cast the data instead (stable across supabase-js versions)
  const { data, error } = await supabase.rpc("admin_list_users", {}); // {} avoids some envs complaining about missing params
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (data ?? []) as UserLite[];
  return NextResponse.json(users, { headers: { "Cache-Control": "no-store" } });
}
