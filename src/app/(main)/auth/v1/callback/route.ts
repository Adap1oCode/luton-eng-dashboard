import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw, "http://localhost"); // base ignored for path check
    return u.pathname.startsWith("/") ? `${u.pathname}${u.search}` : null;
  } catch {
    return raw.startsWith("/") ? raw : null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextParam = safeNext(url.searchParams.get("next")) || "/dashboard";

  // If no code present, bounce back to login
  if (!code) {
    const to = new URL("/login", url.origin);
    to.searchParams.set("next", nextParam);
    to.searchParams.set("error", "missing_code");
    return NextResponse.redirect(to);
  }

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // Your auth-js version expects the code as an argument
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const to = new URL("/login", url.origin);
    to.searchParams.set("next", nextParam);
    to.searchParams.set("error", "magic_link_failed");
    return NextResponse.redirect(to);
  }

  // Success — session cookies are set, go to the intended destination
  return NextResponse.redirect(new URL(nextParam, url.origin));
}

// Ensure no caching of the callback
export const dynamic = "force-dynamic";
