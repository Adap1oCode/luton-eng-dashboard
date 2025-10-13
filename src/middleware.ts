// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function buildSupabase(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // In middleware, NextResponse supports object-style set
            res.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );
}

// very small guard to avoid open redirects
function safeNext(raw: string | null | undefined) {
  if (!raw) return null;
  try {
    const u = new URL(raw, "http://localhost"); // base ignored for path check
    // only allow on-site absolute paths, no protocol/host
    return u.pathname.startsWith("/") ? u.pathname + u.search : null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const res = NextResponse.next();
  const supabase = buildSupabase(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/forms");

  // 1) Require auth for protected areas
  if (isProtected && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // 2) Keep logged-in users out of public auth pages
  const isAuthPage =
    pathname === "/login" || pathname === "/register";
  if (isAuthPage && user) {
    const requestedNext = safeNext(searchParams.get("next"));
    const url = req.nextUrl.clone();
    url.pathname = requestedNext || "/dashboard";
    url.search = ""; // ensure clean redirect
    return NextResponse.redirect(url);
  }

  // 3) Helpful debug header (handy in SSR logs / devtools)
  res.headers.set("x-url", req.nextUrl.toString());
  return res;
}

// Run only where needed (public auth pages for bounce; protected areas for gating)
export const config = {
  matcher: ["/dashboard/:path*", "/forms/:path*", "/login", "/register"],
};
