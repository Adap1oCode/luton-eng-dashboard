import type { Metadata } from "next";

import PageShell from "@/components/forms/shell/page-shell";
import { WarehouseFilterDropdown } from "@/components/forms/shell/warehouse-filter-dropdown";
import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parseListParams, type SPRecord } from "@/lib/next/search-params";
import resources from "@/lib/data/resources";

import { config, compareStockFilterMeta, RESOURCE_KEY } from "./compare-stock.config";
import { toRow } from "./to-row";
import { CompareStockTableClient } from "./compare-stock-table-client";

export const metadata: Metadata = {
  title: config.title,
};

export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  const sp = await resolveSearchParams(props.searchParams);
  const { page, pageSize, filters } = parseListParams(sp, compareStockFilterMeta, { defaultPage: 1, defaultPageSize: 50, max: 500 });

  // Apply all quick filter transforms if present
  const extraQuery: Record<string, any> = { raw: "true" };
  compareStockFilterMeta.forEach((filterMeta) => {
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
  const resourceConfig = (resources as any)[RESOURCE_KEY];
  const hasWarehouseScope = resourceConfig?.warehouseScope?.mode === "column";

  return (
    <PageShell
      title={config.title}
      count={total}
      toolbarConfig={config.toolbar}
      toolbarActions={config.actions}
      toolbarRight={<WarehouseFilterDropdown hasWarehouseScope={hasWarehouseScope} useNameAsValue={true} />}
      chipConfig={{ filter: false, sorting: false }}
      enableAdvancedFilters={false}
      showToolbarContainer={false}
    >
      <CompareStockTableClient
        initialRows={rows}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}
