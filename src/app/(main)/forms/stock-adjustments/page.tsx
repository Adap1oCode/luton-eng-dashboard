// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/page.tsx
// TYPE: Server Component (SSR)
// PURPOSE: Server-side data fetching with direct ResourceTableClient rendering
// PATTERN: PageShell + ResourceTableClient (aligned with users/products screens)
// -----------------------------------------------------------------------------
import type { Metadata } from "next";

import PageShell from "@/components/forms/shell/page-shell";
import { WarehouseFilterDropdown } from "@/components/forms/shell/warehouse-filter-dropdown";
import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parseListParams, type SPRecord } from "@/lib/next/search-params";
import resources from "@/lib/data/resources";

import { config, stockAdjustmentsFilterMeta, RESOURCE_KEY } from "./stock-adjustments.config";
import { toRow } from "./to-row";
import { StockAdjustmentsTableClient } from "./stock-adjustments-table-client";
import { protectRoute } from "@/lib/access/route-guards";

export const metadata: Metadata = {
  title: config.title,
};

export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  // Protect route - check view permission
  const sp = await resolveSearchParams(props.searchParams);
  const warehouseParam = Array.isArray(sp.warehouse) ? sp.warehouse[0] : sp.warehouse;
  await protectRoute("/forms/stock-adjustments", warehouseParam || undefined);
  
  const { page, pageSize, filters } = parseListParams(sp, stockAdjustmentsFilterMeta, { defaultPage: 1, defaultPageSize: 50, max: 500 });

  // Apply all quick filter transforms if present
  const extraQuery: Record<string, any> = { raw: "true" };
  stockAdjustmentsFilterMeta.forEach((filterMeta) => {
    const filterValue = filters[filterMeta.id];
    if (filterValue && filterValue !== "ALL" && filterMeta.toQueryParam) {
      Object.assign(extraQuery, filterMeta.toQueryParam(filterValue));
    }
  });

  const { rows: domainRows, total } = await fetchResourcePage<any>({
    endpoint: config.apiEndpoint,
    page,
    pageSize,
    extraQuery,
  });

  const rows = (domainRows ?? []).map(toRow);

  // Check if resource has warehouseScope config (server-side check)
  // Note: The view v_tcm_user_tally_card_entries has warehouseScope, not the base table
  const resourceConfig = (resources as any)["v_tcm_user_tally_card_entries"] || (resources as any)[RESOURCE_KEY];
  const hasWarehouseScope = resourceConfig?.warehouseScope?.mode === "column";
  
  // Debug logging
  console.log("[StockAdjustments Page] Warehouse scope check:", {
    resourceKey: RESOURCE_KEY,
    hasWarehouseScope,
    warehouseScope: resourceConfig?.warehouseScope,
  });

  return (
    <PageShell
      title={config.title}
      count={total}
      // Action Toolbar (New, Delete, Export buttons) - kept visible
      toolbarConfig={config.toolbar}
      toolbarActions={config.actions}
      // Warehouse filter dropdown (generic - only shows if resource has warehouseScope)
      toolbarRight={<WarehouseFilterDropdown hasWarehouseScope={hasWarehouseScope} />}
      // Hide chips (filter/sorting badges)
      chipConfig={{ filter: false, sorting: false }}
      // AdvancedFilterBar is redundant - bottom toolbar in ResourceTableClient provides all these features
      enableAdvancedFilters={false}
      showToolbarContainer={false}
    >
      <StockAdjustmentsTableClient
        initialRows={rows}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}