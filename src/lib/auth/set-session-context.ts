// -----------------------------------------------------------------------------
// FILE: src/lib/auth/set-session-context.ts
// PURPOSE: Handle session context and user role fetching
// -----------------------------------------------------------------------------

import "server-only";

/**
 * The shape your app expects from /api/me/role (enriched).
 * - Backwards compatible: `allowedWarehouses` remains, now alias for codes.
 */
export type SessionContext = {
  /** @deprecated Use effectiveUser.appUserId instead */
  userId: string;
  // Real user (the authenticated principal)
  realUser: {
    authUserId: string; // Supabase auth user id (UUID)
    appUserId: string; // Your internal users.id/uuid
    fullName: string | null;
    email: string | null;
    roleName: string | null;
    roleCode: string | null;
  };

  // Effective user (who we act as: impersonated or same as real)
  effectiveUser: {
    appUserId: string;
    fullName: string | null;
    email: string | null;
    roleName: string | null;
    roleCode: string | null;
    roleFamily: string | null; // role_family from roles table
    permissions: string[]; // flattened permission keys
  };

  // Permissions (flattened) of the effective user (kept here for convenience)
  permissions: string[];
  permissionDetails: Array<{ key: string; description: string | null }>;

  // Warehouse scope (explicit - no implicit "all")
  // Codes/IDs are both provided; `allowedWarehouses` kept as alias for codes
  allowedWarehouseCodes: string[]; // e.g. ["RTZ"]
  allowedWarehouseIds: string[]; // e.g. ["6a7b...-..."]
  allowedWarehouses: string[]; // alias of allowedWarehouseCodes
  warehouseScope: Array<{ warehouse_id: string; warehouse_code: string; warehouse_name: string }>;
  
  // Default homepage for user (from role or user override)
  defaultHomepage: string | null;

  // Impersonation metadata
  meta: {
    impersonating: boolean;
    startedAt?: string | null;
    requestedImpersonateId?: string | null;
    denial?: string | null;
  };
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
 * - In development: always use HTTP to avoid SSL errors
 * - Use NEXT_PUBLIC_SITE_URL if set (e.g. https://app.example.com)
 * - Else use VERCEL_URL if set (domain only -> we add https://)
 * - Else default to http://localhost:3000
 */
function resolveBaseUrl(): string {
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === "development";

  // For development, always use HTTP with localhost to avoid SSL issues
  if (isDevelopment) {
    const port = process.env.PORT || "3000";
    return `http://localhost:${port}`;
  }

  // For production, use environment variables
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
 */
export async function setSessionContext(cookiesOrHeaders: HeadersLike): Promise<SessionContext> {
  try {
    const cookie = cookiesOrHeaders.get("cookie") ?? "";
    const baseUrl = resolveBaseUrl();

    console.log("🔗 Fetching session from:", `${baseUrl}/api/me/role`);

    const res = await fetch(`${baseUrl}/api/me/role`, {
      headers: cookie ? { cookie } : {},
      cache: "no-store",
    });

    const body = await res.json();

    if (!res.ok) {
      const msg = (body?.error as string) || `session_context_failed (${res.status})`;
      console.error("❌ Session context error:", msg);
      throw new Error(msg);
    }

    // Enforce invariants & backwards-compat here (guard old payloads gracefully)
    const ctx = body as Partial<SessionContext>;

    const codes = ctx.allowedWarehouseCodes ?? ctx.allowedWarehouses ?? [];
    const ids = ctx.allowedWarehouseIds ?? [];
    const warehouseScope = (ctx as any).warehouseScope ?? [];
    const defaultHomepage = (ctx as any).defaultHomepage ?? null;

    const effectiveUser = ctx.effectiveUser!;
    const userId = (ctx as any).userId ?? effectiveUser.appUserId;

    const normalized: SessionContext = {
      userId,
      realUser: ctx.realUser!,
      effectiveUser: ctx.effectiveUser!,
      permissions: ctx.permissions ?? ctx.effectiveUser?.permissions ?? [],
      permissionDetails: ctx.permissionDetails ?? [],

      // Keep both; ensure alias kept in sync
      allowedWarehouseCodes: codes,
      allowedWarehouseIds: ids,
      allowedWarehouses: codes,
      warehouseScope,
      defaultHomepage,

      meta: {
        impersonating: Boolean(ctx.meta?.impersonating),
        startedAt: ctx.meta?.startedAt ?? null,
        requestedImpersonateId: ctx.meta?.requestedImpersonateId ?? null,
        denial: ctx.meta?.denial ?? null,
      },
    };

    console.log("✅ Session context loaded successfully");
    return normalized;
  } catch (error) {
    console.error("❌ Error in setSessionContext:", error);
    throw error;
  }
}
