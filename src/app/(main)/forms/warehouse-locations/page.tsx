// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/warehouse-locations/page.tsx
// TYPE: Server Component (SSR)
// PURPOSE: Server-side data fetching with direct ResourceTableClient rendering
// -----------------------------------------------------------------------------
import type { Metadata } from "next";

import PageShell from "@/components/forms/shell/page-shell";
import { WarehouseFilterDropdown } from "@/components/forms/shell/warehouse-filter-dropdown";
import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parseListParams, type SPRecord } from "@/lib/next/search-params";
import resources from "@/lib/data/resources";
import { createClient as createSupabaseServerClient } from "@/lib/supabase-server";

import { config, RESOURCE_KEY } from "./warehouse-locations.config";
import { toRow } from "./to-row";
import { WarehouseLocationsTableClient } from "./warehouse-locations-table-client";

export const metadata: Metadata = {
  title: config.title,
};

/**
 * Enrich warehouse_locations rows with warehouse names (server-side enrichment)
 * Similar to history enrichment pattern - fetches warehouses in bulk and maps them
 */
async function enrichWarehouseNames(rows: any[]): Promise<any[]> {
  if (!rows || rows.length === 0) return rows;

  // Collect unique warehouse_ids
  const warehouseIds = new Set<string>();
  for (const row of rows) {
    if (row.warehouse_id) {
      warehouseIds.add(String(row.warehouse_id));
    }
  }

  // Fetch warehouses in bulk
  const warehouseMap = new Map<string, { name: string; code: string }>();
  if (warehouseIds.size > 0) {
    const sb = await createSupabaseServerClient();
    const { data: warehouses, error } = await sb
      .from("warehouses")
      .select("id, name, code")
      .in("id", Array.from(warehouseIds));

    if (error) {
      console.error("Failed to fetch warehouses for enrichment:", error);
    } else if (warehouses) {
      for (const warehouse of warehouses) {
        warehouseMap.set(warehouse.id, {
          name: warehouse.name,
          code: warehouse.code,
        });
      }
    }
  }

  // Enrich rows with warehouse names
  return rows.map((row) => {
    const enriched = { ...row };
    if (row.warehouse_id) {
      const warehouse = warehouseMap.get(String(row.warehouse_id));
      enriched.warehouse_name = warehouse?.name ?? null;
      enriched.warehouse_code = warehouse?.code ?? null;
    } else {
      enriched.warehouse_name = null;
      enriched.warehouse_code = null;
    }
    return enriched;
  });
}

export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  const sp = await resolveSearchParams(props.searchParams);
  const { page, pageSize, filters } = parseListParams(sp, [], { defaultPage: 1, defaultPageSize: 50, max: 500 });

  const extraQuery: Record<string, any> = { raw: "true" };

  const { rows: domainRows, total } = await fetchResourcePage<any>({
    endpoint: config.apiEndpoint,
    page,
    pageSize,
    extraQuery,
  });

  // Enrich warehouse names server-side (like history enrichment pattern)
  const enrichedRows = await enrichWarehouseNames(domainRows ?? []);

  // Sort by warehouse name (ascending) after enrichment
  const sortedRows = enrichedRows.sort((a, b) => {
    const nameA = a.warehouse_name || a.warehouse_code || "";
    const nameB = b.warehouse_name || b.warehouse_code || "";
    return nameA.localeCompare(nameB);
  });

  const rows = sortedRows.map(toRow);

  // Check if resource has warehouseScope config (server-side check)
  const resourceConfig = (resources as any)[RESOURCE_KEY];
  const hasWarehouseScope = resourceConfig?.warehouseScope?.mode === "column";

  return (
    <PageShell
      title={config.title}
      count={total}
      toolbarConfig={config.toolbar}
      toolbarActions={config.actions}
      toolbarRight={<WarehouseFilterDropdown hasWarehouseScope={hasWarehouseScope} />}
      chipConfig={{ filter: false, sorting: false }}
      enableAdvancedFilters={false}
      showToolbarContainer={false}
    >
      <WarehouseLocationsTableClient
        initialRows={rows}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}

