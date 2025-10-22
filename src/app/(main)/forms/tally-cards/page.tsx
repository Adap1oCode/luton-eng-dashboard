// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally_cards/page.tsx
// TYPE: Server Component
// PURPOSE: Server page for "View All Tally Cards" with data fetching
// -----------------------------------------------------------------------------
import type { Metadata } from "next";

import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import PageShell from "@/components/forms/shell/page-shell";
import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { mapRows } from "@/lib/data/resources/tally_cards/projection";
import { resolveSearchParams, parsePagination, type SPRecord } from "@/lib/next/search-params";

import { tallyCardsToolbar, tallyCardsChips, tallyCardsActions } from "./toolbar.config";
import { tallyCardsViewConfig } from "./view.config";

// Browser tab title for this screen
export const metadata: Metadata = {
  title: "Tally Cards",
};

// Helper function to convert SPValue to string
function spValueToString(value: any): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  const sp = await resolveSearchParams(props.searchParams);
  const { page, pageSize } = parsePagination(sp, { defaultPage: 1, defaultPageSize: 10, max: 500 });

  // Fetch data from API
  const { rows: domainRows, total } = await fetchResourcePage<any>({
    endpoint: "/api/tally_cards",
    page,
    pageSize,
    extraQuery: {
      sortBy: spValueToString(sp.sortBy),
      sortOrder: spValueToString(sp.sortOrder),
      filter: spValueToString(sp.filter),
      status: spValueToString(sp.status),
      search: spValueToString(sp.search),
    },
  });

  // Map domain rows to UI rows
  const rows = mapRows(domainRows ?? []);

  return (
    <PageShell
      title="Tally Cards"
      count={total}
      toolbarConfig={tallyCardsToolbar}
      toolbarActions={tallyCardsActions}
      chipConfig={tallyCardsChips}
      enableAdvancedFilters={true}
      showSaveViewButton={false}
      showToolbarContainer={false}
    >
      <ResourceTableClient
        config={tallyCardsViewConfig}
        initialRows={rows}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}
