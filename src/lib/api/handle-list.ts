// src/lib/api/handle-list.ts
// One generic list handler used by every list API route.

import { NextResponse } from "next/server";
import { createSupabaseServerProvider } from "@/lib/supabase/factory";
import { resolveResource } from "@/lib/api/resolve-resource";
import { parseListQuery } from "@/lib/http/list-params";

// Scoping + debug flags
import { AUTH_SCOPING_ENABLED } from "@/lib/env";
import { getSessionContext } from "@/lib/auth/get-session-context";
import { debugAuth } from "@/lib/api/debug";

function json(body: any, init?: number | ResponseInit): NextResponse {
  const base: ResponseInit =
    typeof init === "number" ? { status: init } : (init ?? {});
  base.headers = { ...(base.headers ?? {}), "Cache-Control": "no-store" };
  return NextResponse.json(body, base);
}

// Narrow mapper so "unknown resource" becomes 404 (not 500)
function mapError(resourceKey: string, err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "");
  if (
    (err as any)?.code === "RESOURCE_NOT_FOUND" ||
    /unknown resource|invalid resource|no config|not found/i.test(msg)
  ) {
    return json(
      { error: { message: "Unknown resource" }, resource: resourceKey },
      404
    );
  }
  return json(
    {
      error: {
        message:
          (err as any)?.message ??
          (typeof err === "string" ? err : "Internal server error"),
      },
      resource: resourceKey,
    },
    500
  );
}

export async function listHandler(req: Request, resourceKey: string) {
  if (!resourceKey || typeof resourceKey !== "string" || resourceKey.length > 64) {
    return json({ error: { message: "Invalid resource parameter" } }, 400);
  }

  try {
    const entry = await resolveResource(resourceKey);

    const url = new URL(req.url);
    const { q, page, pageSize, activeOnly, raw } = parseListQuery(url);

    const provider = createSupabaseServerProvider(entry.config as any);

    // ✅ Scoping is applied inside the provider (server mode) when AUTH_SCOPING_ENABLED is true.
    //    Provider calls getSessionContext() and applies warehouse/ownership scope internally.
    const { rows, total } = await provider.list({ q, page, pageSize, activeOnly });

    // Optional debug logging (safe; separate session fetch used only for logs)
    if (AUTH_SCOPING_ENABLED) {
      const session = await getSessionContext();
      debugAuth({
        at: "list",
        resource: resourceKey,
        warehouseScope: (entry.config as any)?.warehouseScope,
        ownershipScope: (entry.config as any)?.ownershipScope,
        session: session && {
          userId: session.userId,
          canSeeAllWarehouses: session.canSeeAllWarehouses,
          allowedWarehouses: session.allowedWarehouses,
        },
      });
    }

    let payloadRows: any[] = rows;
    if (!raw && typeof entry.toRow === "function") {
      payloadRows = rows.map((r: any) => entry.toRow!(r));
    } else if (raw && !entry.allowRaw) {
      return json(
        {
          error: {
            message: `Raw mode is not allowed for resource "${resourceKey}".`,
          },
        },
        400
      );
    }

    return json({
      rows: payloadRows,
      total: Number.isFinite(total) ? total : payloadRows.length,
      page,
      pageSize,
      resource: resourceKey,
      raw: raw && entry.allowRaw ? true : false,
    });
  } catch (err) {
    const res = mapError(resourceKey, err);
    if (res.status === 500) {
      console.error("[listHandler]", resourceKey, err);
    }
    return res;
  }
}
