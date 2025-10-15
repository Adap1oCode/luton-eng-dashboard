// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

/**
 * Build a Supabase server client that can read & set auth cookies in middleware.
 * Official pattern from Supabase for Next.js SSR.
 */
function buildSupabase(req: NextRequest, res: NextResponse) {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // NextResponse supports object-style set in middleware
          res.cookies.set({ name, value, ...options });
        });
      },
    },
  });
}

/** Guard against open redirects: allow only on-site absolute paths. */
function safeNext(raw: string | null | undefined) {
  if (!raw) return null;
  try {
    const u = new URL(raw, "http://localhost"); // base ignored for path check
    return u.pathname.startsWith("/") ? u.pathname + u.search : null;
  } catch {
    return null;
  }
}

/** Dev-only debug header stamping so we can prove middleware executed. */
function withDebugHeaders(
  res: NextResponse,
  {
    req,
    userPresent,
    action,
    role,
    requestedNext,
  }: {
    req: NextRequest;
    userPresent: boolean;
    action: "redirect_login" | "redirect_dashboard" | "next";
    role?: string;
    requestedNext?: string | null;
  },
) {
  if (process.env.NODE_ENV !== "production") {
    const sbCookiesPresent = req.cookies.getAll().some((c) => c.name.startsWith("sb-") || c.name.startsWith("sb:"));
    res.headers.set("x-mw", "1"); // proves middleware ran
    res.headers.set("x-url", req.nextUrl.toString());
    res.headers.set("x-auth", userPresent ? "user" : "anon");
    res.headers.set("x-role", role ?? "-");
    res.headers.set("x-action", action);
    res.headers.set("x-next", requestedNext ?? "");
    res.headers.set("x-sb-cookies", sbCookiesPresent ? "present" : "missing");
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Prepare a pass-through response, but we may return a redirect instead
  const res = NextResponse.next();

  const supabase = buildSupabase(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Best-effort role from JWT metadata (Phase-1; can be replaced by DB lookup later)
  const appMeta = (user?.app_metadata ?? {}) as Record<string, unknown>;
  const userMeta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const role = (appMeta.role as string | undefined) ?? (userMeta.role as string | undefined) ?? undefined;

  // Public routes which should be reachable without a session
  const PUBLIC = new Set<string>(["/login", "/register", "/unauthorized"]);
  const isPublicExact = PUBLIC.has(pathname);

  // 1) Unauthenticated → redirect to /login?next=... (deny-by-default)
  if (!user && !isPublicExact) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    const redirectRes = NextResponse.redirect(url);
    return withDebugHeaders(redirectRes, {
      req,
      userPresent: false,
      action: "redirect_login",
      requestedNext: url.searchParams.get("next"),
    });
  }

  // 2) Authenticated → keep them out of "/" and auth pages; honor safe `next`
  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (user && (pathname === "/" || isAuthPage)) {
    const requestedNext = safeNext(searchParams.get("next"));
    const url = req.nextUrl.clone();
    url.pathname = requestedNext || "/dashboard";
    url.search = "";
    const redirectRes = NextResponse.redirect(url);
    return withDebugHeaders(redirectRes, {
      req,
      userPresent: true,
      action: "redirect_dashboard",
      role,
      requestedNext,
    });
  }

  // 3) Pass-through (OK to proceed)
  return withDebugHeaders(res, {
    req,
    userPresent: Boolean(user),
    action: "next",
    role,
    requestedNext: safeNext(searchParams.get("next")),
  });
}

/**
 * Middleware runs for everything except:
 * - API routes
 * - Next static assets / image optimizer
 * - Common public files
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
