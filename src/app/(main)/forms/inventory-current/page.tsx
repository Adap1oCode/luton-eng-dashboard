// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/inventory-current/page.tsx
// TYPE: Server Component (SSR)
// PURPOSE: Read-only list screen for v_inventory_current view
// -----------------------------------------------------------------------------
import type { Metadata } from "next";

import PageShell from "@/components/forms/shell/page-shell";
import { WarehouseFilterDropdown } from "@/components/forms/shell/warehouse-filter-dropdown";
import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parseListParams, type SPRecord } from "@/lib/next/search-params";
import resources from "@/lib/data/resources";

import { config, RESOURCE_KEY } from "./inventory-current.config";
import { toRow } from "./to-row";
import { InventoryCurrentTableClient } from "./inventory-current-table-client";

export const metadata: Metadata = {
  title: config.title,
};

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

  const rows = (domainRows ?? []).map(toRow);

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
      <InventoryCurrentTableClient
        initialRows={rows}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}

