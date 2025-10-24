// Auto-generated page for Product Catalog
import type { Metadata } from "next";
import PageShell from "@/components/forms/shell/page-shell";
import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parsePagination, type SPRecord } from "@/lib/next/search-params";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";

// Generated configuration
import { config } from "./products.config";

export const metadata: Metadata = {
  title: "Product Catalog",
};

function toRow(d: any) {
  return {
    id: d?.id ?? null,
    name: d?.name ?? null,
    description: d?.description ?? null,
    price: d?.price ?? null,
    category: d?.category ?? null,
    stock_quantity: d?.stock_quantity ?? null,
    created_at: d?.created_at ?? null
  };
}

export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  const sp = await resolveSearchParams(props.searchParams);
  const { page, pageSize } = parsePagination(sp, { defaultPage: 1, defaultPageSize: 10, max: 500 });

  const { rows: domainRows, total } = await fetchResourcePage<any>({
    endpoint: "/api/products",
    page,
    pageSize,
    extraQuery: { raw: "true" },
  });

  const rows = (domainRows ?? []).map(toRow);

  return (
    <PageShell
      title="Product Catalog"
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