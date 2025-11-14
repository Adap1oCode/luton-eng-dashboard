// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/roles/page.tsx
// TYPE: Server Component (SSR)
// PURPOSE: Server-side data fetching with direct ResourceTableClient rendering
// PATTERN: PageShell + ResourceTableClient (aligned with stock-adjustments/tally-cards screens)
// -----------------------------------------------------------------------------
import type { Metadata } from "next";

import PageShell from "@/components/forms/shell/page-shell";
import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parseListParams, type SPRecord } from "@/lib/next/search-params";
import { protectRoute } from "@/lib/access/route-guards";

import { config } from "./roles.config";
import { toRow } from "./to-row";
import { RolesTableClient } from "./roles-table-client";

export const metadata: Metadata = {
  title: config.title,
};

export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  // Protect route - check view permission
  const sp = await resolveSearchParams(props.searchParams);
  await protectRoute("/forms/roles");
  
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
      // Action Toolbar (New, Delete, Export buttons) - kept visible
      toolbarConfig={config.toolbar}
      toolbarActions={config.actions}
      // Hide chips (filter/sorting badges)
      chipConfig={{ filter: false, sorting: false }}
      // AdvancedFilterBar is redundant - bottom toolbar in ResourceTableClient provides all these features
      enableAdvancedFilters={false}
      showToolbarContainer={false}
      // Disable views and save view buttons
      showViewsButton={false}
      showSaveViewButton={false}
    >
      <RolesTableClient
        initialRows={rows}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}
