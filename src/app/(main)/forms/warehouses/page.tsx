// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/warehouses/page.tsx
// TYPE: Server Component (SSR)
// PURPOSE: Server-side data fetching with direct ResourceTableClient rendering
// -----------------------------------------------------------------------------
import type { Metadata } from "next";

import PageShell from "@/components/forms/shell/page-shell";
import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parseListParams, type SPRecord } from "@/lib/next/search-params";

import { config, RESOURCE_KEY } from "./warehouses.config";
import { toRow } from "./to-row";
import { WarehousesTableClient } from "./warehouses-table-client";

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

  return (
    <PageShell
      title={config.title}
      count={total}
      toolbarConfig={config.toolbar}
      toolbarActions={config.actions}
      chipConfig={{ filter: false, sorting: false }}
      enableAdvancedFilters={false}
      showToolbarContainer={false}
    >
      <WarehousesTableClient
        initialRows={rows}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}


