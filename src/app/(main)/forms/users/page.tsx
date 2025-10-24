// Auto-generated page for User Management
import type { Metadata } from "next";
import PageShell from "@/components/forms/shell/page-shell";
import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parsePagination, type SPRecord } from "@/lib/next/search-params";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";

// Generated configuration
import { config } from "./users.config";

export const metadata: Metadata = {
  title: "User Management",
};

function toRow(d: any) {
  return {
    id: d?.id ?? null,
    name: d?.name ?? null,
    email: d?.email ?? null,
    role: d?.role ?? null,
    created_at: d?.created_at ?? null,
    active: d?.active ?? null
  };
}

export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  const sp = await resolveSearchParams(props.searchParams);
  const { page, pageSize } = parsePagination(sp, { defaultPage: 1, defaultPageSize: 10, max: 500 });

  const { rows: domainRows, total } = await fetchResourcePage<any>({
    endpoint: "/api/users",
    page,
    pageSize,
    extraQuery: { raw: "true" },
  });

  const rows = (domainRows ?? []).map(toRow);

  return (
    <PageShell
      title="User Management"
      count={total}
      toolbarConfig={config.toolbar}
      toolbarActions={config.actions}
      chipConfig={{ filter: true, sorting: true }}
      enableAdvancedFilters={true}
      showSaveViewButton={false}
      showToolbarContainer={false}
    >
      <ResourceTableClient
        config={config.viewConfig}
        initialRows={rows}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}