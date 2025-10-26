// -----------------------------------------------------------------------------
// FILE: src/lib/next/server-helpers.ts
// PURPOSE:
//   Common utilities for Next.js 15 server routes and server components.
//   • Safe awaiting of ctx.params (Next 15 returns a Promise)
//   • Unified access to headers(), base URL, and cookies for SSR/API calls
//   • Prevents repeating boilerplate in every route file
// -----------------------------------------------------------------------------

import { headers as nextHeaders } from "next/headers";

import { logBase } from "@/lib/obs/logger";
import { getRequestContext } from "@/lib/obs/request-context";

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
 * Includes logging for failed requests to help with debugging.
 */
export async function serverFetchJson<T = any>(
  url: string,
  options: RequestInit & { cookie?: string } = {},
): Promise<T> {
  const ctx = getRequestContext();
  const log = ctx ? logBase({ 
    request_id: ctx.request_id,
    route: ctx.route,
    method: ctx.method 
  }) : logBase({});

  const started = Date.now();
  
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        ...(options.cookie ? { cookie: options.cookie } : {}),
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const duration_ms = Date.now() - started;

    if (!res.ok) {
      // Log failed requests with context
      log.warn({
        evt: "server_fetch_failed",
        url,
        status: res.status,
        status_text: res.statusText,
        duration_ms,
        method: options.method ?? "GET",
        request_id: ctx?.request_id
      });
      
      throw new Error(`serverFetchJson failed ${res.status}: ${url}`);
    }

    // Log successful requests (optional, can be removed if too verbose)
    if (duration_ms > 1000) { // Only log slow requests
      log.info({
        evt: "server_fetch_slow",
        url,
        status: res.status,
        duration_ms,
        method: options.method ?? "GET",
        request_id: ctx?.request_id
      });
    }

    return res.json() as Promise<T>;
  } catch (err: any) {
    const duration_ms = Date.now() - started;
    
    // Log fetch errors
    log.error({
      evt: "server_fetch_error",
      url,
      duration_ms,
      method: options.method ?? "GET",
      error_message: err?.message,
      error_code: err?.code,
      request_id: ctx?.request_id
    });
    
    throw err;
  }
}
