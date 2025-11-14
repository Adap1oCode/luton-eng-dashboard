import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
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
    const to = new URL("/auth/login", url.origin);
    to.searchParams.set("next", fallbackNext);
    to.searchParams.set("error", "missing_code");
    return NextResponse.redirect(to);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // Exchange the code for a session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession error:", {
      error: error.message,
      code: code.substring(0, 20) + "...",
      url: url.toString(),
    });
    const fallbackNext = requestedNext || "/dashboard";
    const to = new URL("/auth/login", url.origin);
    to.searchParams.set("next", fallbackNext);
    to.searchParams.set("error", "magic_link_failed");
    return NextResponse.redirect(to);
  }

  console.log("[auth/callback] Successfully exchanged code for session:", {
    userId: data?.user?.id,
    email: data?.user?.email,
  });

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
