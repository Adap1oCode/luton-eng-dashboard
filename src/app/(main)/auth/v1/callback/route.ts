import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseServer } from "@/lib/supabase-server";

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw, "http://localhost"); // base ignored for path check
    return u.pathname.startsWith("/") ? `${u.pathname}${u.search}` : null;
  } catch {
    return raw.startsWith("/") ? raw : null;
  }
}

/**
 * Get user's default homepage from the materialized view
 */
async function getDefaultHomepage(appUserId: string): Promise<string | null> {
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from("mv_effective_permissions")
      .select("default_homepage")
      .eq("user_id", appUserId)
      .maybeSingle<{ default_homepage: string | null }>();
    
    return data?.default_homepage ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const requestedNext = safeNext(url.searchParams.get("next"));

  // If no code present, bounce back to login
  if (!code) {
    const fallbackNext = requestedNext || "/dashboard";
    const to = new URL("/login", url.origin);
    to.searchParams.set("next", fallbackNext);
    to.searchParams.set("error", "missing_code");
    return NextResponse.redirect(to);
  }

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // Your auth-js version expects the code as an argument
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const fallbackNext = requestedNext || "/dashboard";
    const to = new URL("/login", url.origin);
    to.searchParams.set("next", fallbackNext);
    to.searchParams.set("error", "magic_link_failed");
    return NextResponse.redirect(to);
  }

  // Success — session cookies are set
  // Determine redirect destination: requested next > default homepage > /dashboard
  let redirectPath = requestedNext;
  
  if (!redirectPath) {
    // Get user's app user id to fetch default homepage
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: userRow } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", authUser.id)
        .maybeSingle<{ id: string }>();
      
      if (userRow?.id) {
        const defaultHomepage = await getDefaultHomepage(userRow.id);
        redirectPath = defaultHomepage || "/dashboard";
      } else {
        redirectPath = "/dashboard";
      }
    } else {
      redirectPath = "/dashboard";
    }
  }

  return NextResponse.redirect(new URL(redirectPath, url.origin));
}

// Ensure no caching of the callback
export const dynamic = "force-dynamic";
