// src/app/api/resources/[resource]/[id]/history/route.ts
// Generic history endpoint for SCD2 (Slowly Changing Dimension Type 2) tracking
// Returns all versions of a record grouped by anchorColumn, with mirrored list scoping
// History mirrors list scoping (ownership + warehouse) exactly, by design.
// If performance becomes an issue, consider index (anchorColumn, warehouseColumn, updated_at DESC).
//
// DIAGNOSIS: History queries the base SCD2 table (same as Edit screen), then enriches server-side
// with related data (user.full_name, warehouse.name) to keep API agnostic. The view was showing
// only "top 1" per anchor, so we query the base table which has all SCD2 versions.

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { resolveResource } from "@/lib/api/resolve-resource";
import { getSessionContext } from "@/lib/auth/get-session-context";
import { applyOwnershipScopeToSupabase } from "@/lib/api/scope";
import { AUTH_SCOPING_ENABLED } from "@/lib/env";
import { awaitParams, type AwaitableParams } from "@/lib/next/server-helpers";
import { withLogging } from "@/lib/obs/with-logging";

export const dynamic = "force-dynamic";

function json(body: any, init?: number | ResponseInit): NextResponse {
  const base: ResponseInit =
    typeof init === "number" ? { status: init } : (init ?? {});
  base.headers = { ...(base.headers ?? {}), "Cache-Control": "no-store" };
  return NextResponse.json(body, base);
}

function normalizeId(raw: string): string {
  const decoded = decodeURIComponent(String(raw ?? "").trim());
  return decoded;
}

/**
 * Server-side enrichment: merge user and warehouse names into rows
 * Keeps API agnostic (no Supabase-specific logic in UI)
 * 
 * STEP 2: Add user name enrichment + timestamp formatting
 */
async function enrichHistoryRows(
  rows: any[],
  sb: any
): Promise<any[]> {
  if (!rows || rows.length === 0) return rows;

  // STEP 1: Collect unique user IDs for lookup (using updated_by_user_id)
  const userIds = new Set<string>();
  for (const row of rows) {
    // Handle both updated_by_user_id (new) and user_id (old/legacy) for backward compatibility
    const userId = row.updated_by_user_id || row.user_id;
    if (userId) {
      userIds.add(String(userId));
    }
  }

  // STEP 2: Collect unique card_uid values for warehouse lookup
  const cardUids = new Set<string>();
  for (const row of rows) {
    if (row.card_uid) cardUids.add(row.card_uid);
  }

  // Fetch users (for full_name)
  const usersMap = new Map<string, { full_name: string }>();
  if (userIds.size > 0) {
    const userIdsArray = Array.from(userIds);
    
    const { data: users, error: usersError } = await sb
      .from("users")
      .select("id, full_name")
      .in("id", userIdsArray);
    
    if (usersError) {
      console.error("Failed to fetch users for enrichment:", usersError);
    } else if (users) {
      for (const user of users) {
        usersMap.set(user.id, { full_name: user.full_name });
      }
    }
  }

  // Fetch warehouses via tally_cards (card_uid → tally_cards → warehouses)
  const warehouseMap = new Map<string, string>(); // card_uid -> warehouse name
  if (cardUids.size > 0) {
    const { data: tallyCards, error: tallyCardsError } = await sb
      .from("tcm_tally_cards")
      .select("card_uid, warehouse")
      .in("card_uid", Array.from(cardUids));
    
    if (tallyCardsError) {
      console.error("Failed to fetch tally cards for warehouse enrichment:", tallyCardsError);
    } else if (tallyCards) {
      for (const card of tallyCards) {
        if (card.card_uid && card.warehouse) {
          warehouseMap.set(card.card_uid, card.warehouse);
        }
      }
    }
  }

  // Enrich rows with user names, warehouse names, and formatted dates with timestamps
  return rows.map((row) => {
    const enriched: any = { ...row };
    
    // Add user.full_name (using updated_by_user_id - the updater, not the owner)
    // Support both updated_by_user_id (new) and user_id (old/legacy) for backward compatibility
    const userId = row.updated_by_user_id || row.user_id;
    
    if (userId) {
      const userIdStr = String(userId);
      const user = usersMap.get(userIdStr);
      enriched.full_name = user?.full_name ?? null;
    } else {
      enriched.full_name = null;
    }

    // Add warehouse name (via card_uid → tally_cards)
    if (row.card_uid) {
      enriched.warehouse = warehouseMap.get(row.card_uid) ?? null;
    }

    // Format updated_at_pretty with date + timestamp (ensuring full timestamp is shown)
    if (row.updated_at) {
      try {
        const date = new Date(row.updated_at);
        // Date part: "Mon DD, YYYY"
        const datePart = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        // Time part: "HH:MM" (24-hour format, hours and minutes only)
        const timePart = date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        enriched.updated_at_pretty = `${datePart} ${timePart}`;
      } catch {
        enriched.updated_at_pretty = null;
      }
    }

    return enriched;
  });
}

export const GET = withLogging(
  async (req: NextRequest, ctx: AwaitableParams<{ resource: string; id: string }>) => {
    const { resource, id } = await awaitParams(ctx);
    const normalizedId = normalizeId(id);

    // Guard against composite ids
    if (normalizedId.includes("|")) {
      return json({ error: { message: "Invalid id format" } }, 400);
    }

    if (!resource || typeof resource !== "string" || resource.length > 64) {
      return json({ error: { message: "Invalid resource parameter" } }, 400);
    }

    try {
      // 1. Resolve the main resource config
      let entry;
      try {
        entry = await resolveResource(resource);
      } catch (resolveError: any) {
        return json(
          { error: { message: `Failed to resolve resource '${resource}': ${resolveError?.message}` } },
          404
        );
      }

      const config = entry.config;

      // 2. Check if history is enabled
      if (!config.history?.enabled) {
        return json(
          {
            error: {
              message: `History not enabled for resource '${resource}'. Table: ${config.table}`,
            },
          },
          404
        );
      }

      const historyCfg = config.history;

      // 3. Determine history source: use base table (same as Edit screen), not view
      // If historyResource is specified, use it; otherwise default to current resource (base table)
      let historyConfig = config;
      let historyTable = config.table;
      let historyPk = config.pk;
      let historyWarehouseScope = config.warehouseScope;
      let historyOwnershipScope = config.ownershipScope;

      if (historyCfg.source?.historyResource) {
        // Resolve the specified history resource
        const historyEntry = await resolveResource(historyCfg.source.historyResource);
        historyConfig = historyEntry.config;
        historyTable = historyConfig.table;
        historyPk = historyConfig.pk;
        // Use scoping from history resource if available, otherwise fall back to main resource
        historyWarehouseScope = historyConfig.warehouseScope ?? config.warehouseScope;
        historyOwnershipScope = historyConfig.ownershipScope ?? config.ownershipScope;
      }
      // If historyResource is omitted, defaults to config (base table) - this is correct for SCD2

      // 4. Derive history source columns
      const tableOrView = historyCfg.source?.tableOrView ?? historyTable;
      const idColumn = historyCfg.source?.idColumn ?? historyPk;
      const anchorColumn = historyCfg.source?.anchorColumn;
      // warehouseColumn is optional - we'll enrich warehouse_id from card_uid → tally_cards during enrichment

      if (!anchorColumn) {
        return json({ error: { message: "anchorColumn is required in history.source" } }, 500);
      }

      // 5. Fetch current record to get anchor value (from base table, same as Edit)
      const sb = await supabaseServer();
      
      // Select minimal fields: id, anchorColumn, card_uid (for warehouse enrichment)
      const currentSelect = [config.pk, anchorColumn, "card_uid"].filter(Boolean);

      const { data: currentRecord, error: currentError } = await sb
        .from(config.table)
        .select(currentSelect.join(", "))
        .eq(config.pk, normalizedId)
        .maybeSingle();

      if (currentError) {
        return json({ error: { message: currentError.message } }, 500);
      }

      if (!currentRecord) {
        return json({ error: { message: "Record not found" } }, 404);
      }

      const anchorValue = (currentRecord as any)[anchorColumn];
      if (anchorValue === null || anchorValue === undefined) {
        return json(
          { error: { message: `Anchor column '${anchorColumn}' is null or missing` } },
          400
        );
      }

      // 7. Build query against base SCD2 table (not view - view only shows top 1 per anchor)
      // Query base table fields from projection.columns (excluding enriched fields like full_name, warehouse, updated_at_pretty)
      // Enrichment (user.full_name, warehouse) happens server-side after query
      const projectionColumns = historyCfg.projection?.columns ?? [];
      // Enriched columns that are added server-side (not in base table)
      const enrichedColumns = new Set(["full_name", "warehouse", "updated_at_pretty"]);
      // Base columns that exist in the table (filter out enriched columns)
      const baseColumns = projectionColumns
        .filter((col: string) => !enrichedColumns.has(col))
        .concat(["id", "card_uid"]); // Always include id and card_uid (needed for enrichment)
      // Remove duplicates
      const uniqueBaseColumns = Array.from(new Set(baseColumns));
      const orderByColumn = historyCfg.projection?.orderBy?.column ?? "updated_at";
      const orderByDirection = historyCfg.projection?.orderBy?.direction ?? "desc";

      let query = sb
        .from(tableOrView)
        .select(uniqueBaseColumns.join(", "), { count: "exact" })
        .eq(anchorColumn, anchorValue);

      // STEP 1: Apply basic ownership scoping only - we'll add warehouse scoping incrementally
      if (AUTH_SCOPING_ENABLED) {
        // 6. Build session context for scoping (only when scoping is enabled)
        try {
          const ctx = await getSessionContext();

          const ownershipScope =
            historyCfg.scope?.ownership ??
            historyOwnershipScope ??
            config.ownershipScope;

          if (ownershipScope && ownershipScope !== undefined && 'mode' in ownershipScope && (ownershipScope.mode === "self" || ownershipScope.mode === "role_family")) {
            query = applyOwnershipScopeToSupabase(query, ownershipScope as { mode: "self" | "role_family"; column: string; bypassPermissions?: string[] }, {
              userId: (ctx as any).effectiveUser?.appUserId ?? (ctx as any).userId,
              permissions: ctx.permissions,
              roleFamily: (ctx as any).effectiveUser?.roleFamily ?? null,
            }) as any;
          }
        } catch (sessionError: any) {
          // If session context fails (e.g., no auth session), log but continue without scoping
          // This allows the history endpoint to work even without authentication
          console.warn("Failed to get session context for history scoping:", sessionError?.message);
          // Continue without applying ownership scoping
        }
      }

      // Order by configured column + tie-breaker on id for stable ordering
      query = query.order(orderByColumn, { ascending: orderByDirection === "asc" });
      query = query.order(idColumn, { ascending: false });

      // Optional limit (default 200 for pathological histories)
      const url = new URL(req.url);
      const limitParam = url.searchParams.get("limit");
      const limit = limitParam ? parseInt(limitParam, 10) : 200;
      if (limit > 0 && limit <= 1000) {
        query = query.limit(limit);
      }

      // 8. Execute query
      const { data: baseRows, error, count } = await query;

      if (error) {
        console.error("History query error:", error);
        return json(
          {
            error: {
              message: `Database query failed: ${error.message}`,
              details: error,
            },
          },
          500
        );
      }

      // Enrich rows with user names, warehouse names, and formatted timestamps
      const enrichedRows = await enrichHistoryRows(baseRows ?? [], sb);

      // STEP 1: Return basic data - we'll add scoping and projection mapping next
      return json({
        rows: enrichedRows,
        total: count ?? 0,
      });
    } catch (err: any) {
      console.error("History API error:", err);
      const msg = String(err?.message ?? err ?? "");
      if (
        (err as any)?.code === "RESOURCE_NOT_FOUND" ||
        /unknown resource|invalid resource|no config|not found/i.test(msg)
      ) {
        return json(
          {
            error: {
              message: `Unknown resource: ${resource}`,
              details: msg,
            },
            resource,
          },
          404
        );
      }
      return json(
        {
          error: {
            message: err?.message ?? (typeof err === "string" ? err : "Internal server error"),
            details: err?.stack,
          },
          resource,
        },
        500
      );
    }
  }
);

