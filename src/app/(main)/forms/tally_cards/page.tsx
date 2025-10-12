// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally_cards/page.tsx
// TYPE: Server Component
// PURPOSE: SSR page for "View All Tally Cards" using shared Shell + ResourceTableClient
// NOTES:
//  • Fetches from /api/tally_cards with no-store
//  • Passes DataTable config + SSR data to the client island
//  • Passes toolbarConfig/chipConfig from screen config to Shell
// -----------------------------------------------------------------------------

import PageShell from "@/components/forms/shell/page-shell";
import { headers, cookies } from "next/headers";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import { tallyCardsViewConfig } from "./view.config";
import { tallyCardsToolbar, tallyCardsChips } from "./toolbar.config";
import type { TallyCardRow } from "@/lib/data/resources/tally_cards/types";


type PageProps = {
  searchParams?: { page?: string; pageSize?: string };
};

export default async function Page({ searchParams }: PageProps) {
  const page = Math.max(1, Number(searchParams?.page ?? 1));
  const pageSize = Math.min(500, Math.max(1, Number(searchParams?.pageSize ?? 200)));

  // Build absolute URL for SSR fetch (works on localhost and Vercel)
  const h = await headers();
  const protocol = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  const base = `${protocol}://${host}`;

  // Forward cookies to preserve the Supabase session (RLS)
  const c = await cookies();
  const cookieHeader = c
    .getAll()
    .map((cookie: { name: string; value: string }) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const res = await fetch(`${base}/api/tally_cards?page=${page}&pageSize=${pageSize}`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  let rows: TallyCardRow[] = [];
  let total = 0;

  if (res.ok) {
    const json = await res.json();
    const payload = json ?? {};
    const parsedRows = (payload.rows ?? payload.data ?? []) as TallyCardRow[];
    const parsedTotal = Number(payload.total ?? payload.count ?? parsedRows.length);
    rows = parsedRows;
    total = parsedTotal;
  } else {
    rows = [];
    total = 0;
  }

  return (
    <PageShell
      title="View Tally Cards"
      count={total}
      toolbarConfig={tallyCardsToolbar}
      chipConfig={tallyCardsChips}
    >
      <ResourceTableClient<TallyCardRow>
        config={tallyCardsViewConfig}
        initialRows={rows}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}
