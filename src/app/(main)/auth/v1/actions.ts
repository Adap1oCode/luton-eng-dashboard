"use server";

import { cookies, headers } from "next/headers";

import { createServerClient } from "@supabase/ssr";

async function getServerClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}

/**
 * Send a magic link and carry ?next=... through to the callback.
 * We prefer a server-derived origin (host/proto) for security, but keep the same signature
 * so existing callers don't need to change.
 */
export async function sendMagicLink(email: string, originFromClient: string, next: string) {
  // 1) Sanitize the next hop (internal paths only)
  const safeNext = typeof next === "string" && next.startsWith("/") ? next : "/dashboard";

  // 2) Derive a trusted origin on the server
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  // Derive origin from request headers (most reliable for current request)
  const derivedOrigin = host ? `${proto}://${host}` : "";
  
  // Check if this is a localhost request
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
  const isDevelopment = process.env.NODE_ENV === "development";
  const siteEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  
  // CRITICAL: Always use derived origin for localhost requests, regardless of NEXT_PUBLIC_SITE_URL
  // This ensures localhost requests NEVER use production URLs
  let origin: string;
  if (isLocalhost && derivedOrigin) {
    // Localhost detected - always use it, ignore NEXT_PUBLIC_SITE_URL
    origin = derivedOrigin;
  } else if (isDevelopment && derivedOrigin) {
    // Development mode - prefer derived origin over NEXT_PUBLIC_SITE_URL
    origin = derivedOrigin;
  } else {
    // Production or no derived origin - use NEXT_PUBLIC_SITE_URL or fallback
    origin = siteEnv || derivedOrigin || originFromClient;
  }

  // 3) Send the magic link
  const supabase = await getServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/v1/callback?next=${encodeURIComponent(safeNext)}`,
      // Optional: auto-create account if it doesn't exist (comment out if undesired)
      shouldCreateUser: true,
    },
  });

  if (error) throw new Error(error.message);
}
