import { NextResponse } from "next/server";

import { supabaseServerAction } from "@/server/server-actions";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/(main)/dashboard";

  const supabase = await supabaseServerAction();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/(main)/auth/v1/login?error=${encodeURIComponent(error.message)}`);
    }
  }
  return NextResponse.redirect(`${origin}${next}`);
}
