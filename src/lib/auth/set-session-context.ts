// src/lib/auth/set-session-context.ts
import "server-only";

/**
 * The shape your app expects from /api/me/role
 */
export type SessionContext = {
  userId: string;
  fullName: string | null;
  email: string | null;
  roleName: string | null;
  roleCode: string | null;
  avatarUrl: string | null;
  permissions: string[];
  permissionDetails: Array<{ key: string; description: string | null }>;
  allowedWarehouses: string[];     // [] + canSeeAllWarehouses=true => global access
  canSeeAllWarehouses: boolean;
};

/**
 * Minimal "headers-like" type so this works with Next.js headers(),
 * Request.headers, or any object exposing .get("cookie").
 */
export type HeadersLike =
  | Headers
  | {
      get(name: string): string | null | undefined;
    };

/**
 * Resolve an absolute base URL for server-side fetches.
 * - Use NEXT_PUBLIC_SITE_URL if set (e.g. https://app.example.com)
 * - Else use VERCEL_URL if set (domain only -> we add https://)
 * - Else default to http://localhost:3000
 */
function resolveBaseUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const base = envUrl || "http://localhost:3000";
  return base.replace(/\/+$/, "");
}

/**
 * Fetch the session context from /api/me/role.
 * Pass server headers (with cookies) so Supabase session is forwarded.
 *
 * Usage (Server/Route Handler):
 *   import { headers } from "next/headers";
 *   const ctx = await setSessionContext(headers());
 */
export async function setSessionContext(
  cookiesOrHeaders: HeadersLike,
): Promise<SessionContext> {
  const cookie = cookiesOrHeaders.get("cookie") ?? "";

  const res = await fetch(`${resolveBaseUrl()}/api/me/role`, {
    headers: cookie ? { cookie } : {},
    cache: "no-store",
  });

  const body = await res.json();

  if (!res.ok) {
    // Surface the backend error during development; keep message terse otherwise
    const msg =
      (body?.error as string) ||
      `session_context_failed (${res.status})`;
    throw new Error(msg);
  }

  return body as SessionContext;
}
