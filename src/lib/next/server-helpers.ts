// -----------------------------------------------------------------------------
// FILE: src/lib/next/server-helpers.ts
// PURPOSE:
//   Common utilities for Next.js 15 server routes and server components.
//   • Safe awaiting of ctx.params (Next 15 returns a Promise)
//   • Unified access to headers(), base URL, and cookies for SSR/API calls
//   • Prevents repeating boilerplate in every route file
// -----------------------------------------------------------------------------

import { headers as nextHeaders } from "next/headers";

/**
 * Await Next.js 15 route params safely.
 * Example:
 *   export async function GET(_req, ctx: AwaitableParams<{ id: string }>) {
 *     const { id } = awaitParams(ctx);
 *   }
 */
export type AwaitableParams<T> = { params: Promise<T> };

export async function awaitParams<T>(ctx: AwaitableParams<T>): Promise<T> {
  return ctx.params;
}

/**
 * Extract base URL, headers, and cookies from the current request context.
 * Use this in server components or SSR API calls where you need:
 *   • The full base URL (proto + host)
 *   • Forwarded cookie for RLS (Supabase)
 *   • Raw headers if needed for diagnostics
 */
export async function serverRequestMeta() {
  const h = await nextHeaders();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = (h.get("x-forwarded-proto") ?? "http").split(",")[0]?.trim();
  const base = `${proto}://${host}`;
  const cookie = h.get("cookie") ?? "";

  return { base, cookie, headers: h };
}

/**
 * Simple helper for server-side fetch calls that need user session cookies.
 * Always disables cache to ensure fresh data.
 */
export async function serverFetchJson<T = any>(
  url: string,
  options: RequestInit & { cookie?: string } = {},
): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      ...(options.cookie ? { cookie: options.cookie } : {}),
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`serverFetchJson failed ${res.status}: ${url}`);
  }

  return res.json() as Promise<T>;
}
