import PageShell from "@/components/forms/shell/page-shell";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import { resolveSearchParams, parsePagination, type SPRecord } from "@/lib/next/search-params";
import { fetchResourcePage } from "@/lib/data/resource-fetch";

type ResourceSSRPageProps<Row extends { id: string }> = {
  title: string;
  endpoint: string;
  config: unknown;
  toolbar?: any;
  chips?: any;
  actions?: any;
  enableAdvancedFilters?: boolean;
  defaultPageSize?: number;
  maxPageSize?: number;
  searchParams?: Promise<SPRecord> | SPRecord;
};

function coerceId(row: any, idx: number): string {
  if (typeof row?.id === "string" && row.id.length > 0) return row.id;
  const parts: string[] = [];
  if (row?.user_id) parts.push(String(row.user_id));
  if (row?.tally_card_number) parts.push(String(row.tally_card_number));
  if (row?.card_uid) parts.push(String(row.card_uid));
  if (row?.updated_at) parts.push(String(row.updated_at));
  parts.push(String(idx));
  return parts.join("|");
}

export default async function ResourceSSRPage<Row extends { id: string }>({
  title,
  endpoint,
  config,
  toolbar,
  chips,
  actions,
  enableAdvancedFilters = true,
  defaultPageSize = 200,
  maxPageSize = 500,
  searchParams,
}: ResourceSSRPageProps<Row>) {
  const sp = await resolveSearchParams(searchParams);
  const { page, pageSize } = parsePagination(sp, { defaultPage: 1, defaultPageSize, max: maxPageSize });

  const { rows, total } = await fetchResourcePage<Row>({ endpoint, page, pageSize });

  const rowsWithId = rows.map((r, i) =>
    (typeof (r as any).id === "string" && (r as any).id.length > 0)
      ? r
      : ({ ...(r as any), id: coerceId(r, i) } as Row)
  );

  // ✅ Server-side materialization: remove functions from config before sending to client
  let clientConfig: any = config;
  const maybeFn = (config as any)?.buildColumns;
  if (typeof maybeFn === "function") {
    const cols = maybeFn();
    clientConfig = { ...(config as any), columns: cols };
    delete clientConfig.buildColumns; // strip function to satisfy Next.js serialization
  }

  return (
    <PageShell
      title={title}
      count={total}
      toolbarConfig={toolbar}
      toolbarActions={actions}
      chipConfig={chips}
      enableAdvancedFilters={enableAdvancedFilters}
    >
      <ResourceTableClient<Row>
        config={clientConfig /* now plain-data only */}
        initialRows={rowsWithId}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}
