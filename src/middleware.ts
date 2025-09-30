// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

function buildSupabase(req: NextRequest, res: NextResponse) {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
  });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();

  // Build Supabase client bound to this request/response
  const supabase = buildSupabase(req, res);

  // Read current user session (if any)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1) Require auth for /dashboard/**
  if (pathname.startsWith("/dashboard") && !user) {
    const url = req.nextUrl.clone();
    // Preserve ?next so we can send the user back after login
    url.pathname = "/auth/v1/login";
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // 2) If already logged in, keep users out of /auth/**
  if (pathname.startsWith("/auth") && user) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = ""; // clear any leftover query
    return NextResponse.redirect(url);
  }

  // 3) Keep your helper header for server components
  res.headers.set("x-url", req.nextUrl.toString());

  return res;
}

// Only run on the routes we care about
export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};
