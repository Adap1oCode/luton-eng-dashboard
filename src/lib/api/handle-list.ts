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
    const parsed = parseListQuery(url);
    const { q, page, pageSize, activeOnly, raw } = parsed;

    const provider = createSupabaseServerProvider(entry.config as any);

    // ✅ Scoping is applied inside the provider (server mode) when AUTH_SCOPING_ENABLED is true.
    //    Provider calls getSessionContext() and applies warehouse/ownership scope internally.
    
    // Extract filters: structured (filters[col][value/mode]) + numeric (qty_gt) + custom
    const filters: Record<string, any> = {};
    const sp = (parsed as any).searchParams as URLSearchParams | undefined;
    if (sp) {
      for (const [key, value] of sp.entries()) {
        // Skip standard list parameters
        if (['q', 'page', 'pageSize', 'activeOnly', 'raw'].includes(key)) continue;
        
        // Structured filters: filters[col][value], filters[col][mode]
        const m = key.match(/^filters\[(.+?)\]\[(value|mode)\]$/);
        if (m) {
          const col = m[1];
          const kind = m[2] as "value" | "mode";
          filters[col] = filters[col] || {};
          filters[col][kind] = value;
        }
        // Numeric and date comparison filters: qty_gt, updated_at_gte, etc.
        else if (key.endsWith('_gt') || key.endsWith('_gte') || key.endsWith('_lt') || key.endsWith('_lte') || key.endsWith('_eq')) {
          // Try numeric first (for qty, etc.)
          const numValue = Number(value);
          if (Number.isFinite(numValue)) {
            filters[key] = numValue;
          } else {
            // If not numeric, pass through as string (for dates, etc.)
            filters[key] = value;
          }
        }
        // Other custom filters
        else {
          filters[key] = value;
        }
      }
    }
    let rows: any[];
    let total: number;
    try {
      const result = await provider.list({ q, page, pageSize, activeOnly, filters });
      rows = result.rows;
      total = result.total;
    } catch (dbError: any) {
      const dbMsg = String(dbError?.message ?? dbError ?? "");
      console.error("[listHandler] Database error:", {
        resource: resourceKey,
        table: entry.config.table,
        error: dbMsg,
        code: (dbError as any)?.code,
      });
      
      // Check if it's a "relation does not exist" error
      if (/relation.*does not exist|relation.*not found/i.test(dbMsg)) {
        throw new Error(
          `Database table/view "${entry.config.table}" does not exist. ` +
          `Please run the migration: supabase/migrations/20250203_create_v_warehouse_locations_view.sql`
        );
      }

      // Check for missing column errors (including item_number)
      if (/column.*does not exist|column.*not found/i.test(dbMsg)) {
        // Check specifically for item_number
        if (/item_number/i.test(dbMsg) && entry.config.table === "v_tcm_user_tally_card_entries") {
          throw new Error(
            `Column "item_number" is missing from view "${entry.config.table}". ` +
            `Please run the migration: supabase/migrations/20250203_add_item_number_to_v_tcm_user_tally_card_entries.sql`
          );
        }
        // Generic column error
        throw new Error(
          `Database error: ${dbMsg}. ` +
          `This may be due to a missing column in "${entry.config.table}". ` +
          `Please check your migrations.`
        );
      }
      
      // Re-throw with original error
      throw dbError;
    }

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
    console.error("[listHandler] Error for resource:", resourceKey, {
      error: err,
      message: (err as any)?.message,
      stack: (err as any)?.stack,
    });
    const res = mapError(resourceKey, err);
    if (res.status === 500) {
      console.error("[listHandler] 500 error details:", resourceKey, err);
    }
    return res;
  }
}
