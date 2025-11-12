// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally-cards/page.tsx
// TYPE: Server Component (SSR)
// PURPOSE: Server-side data fetching with direct ResourceTableClient rendering
// PATTERN: PageShell + ResourceTableClient (aligned with users/products screens)
// -----------------------------------------------------------------------------
import type { Metadata } from "next";

import PageShell from "@/components/forms/shell/page-shell";
import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parseListParams, type SPRecord } from "@/lib/next/search-params";

import { config, tallyCardsFilterMeta } from "./tally-cards.config";
import { toRow } from "./to-row";
import { TallyCardsTableClient } from "./tally-cards-table-client";
import { protectRoute } from "@/lib/access/route-guards";

export const metadata: Metadata = {
  title: config.title,
};

export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  // Protect route - check view permission
  const sp = await resolveSearchParams(props.searchParams);
  const warehouseParam = Array.isArray(sp.warehouse) ? sp.warehouse[0] : sp.warehouse;
  await protectRoute("/forms/tally-cards", warehouseParam || undefined);
  
  const { page, pageSize, filters } = parseListParams(sp, tallyCardsFilterMeta, { defaultPage: 1, defaultPageSize: 50, max: 500 });

  // Apply all quick filter transforms if present
  const extraQuery: Record<string, any> = { raw: "true" };
  tallyCardsFilterMeta.forEach((filterMeta) => {
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

  return (
    <PageShell
      title={config.title}
      count={total}
      // Action Toolbar (New, Delete, Export buttons) - kept visible
      toolbarConfig={config.toolbar}
      toolbarActions={config.actions}
      // Hide chips (filter/sorting badges)
      chipConfig={{ filter: false, sorting: false }}
      // AdvancedFilterBar is redundant - bottom toolbar in ResourceTableClient provides all these features
      enableAdvancedFilters={false}
      showToolbarContainer={false}
    >
      <TallyCardsTableClient
        initialRows={rows}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}