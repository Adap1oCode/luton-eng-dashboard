// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally_cards/page.tsx
// TYPE: Server Component
// PURPOSE: SSR page for "View All Tally Cards" using shared Shell + ResourceTableClient
// NOTES:
//  • Fetches from /api/tally_cards with no-store
//  • Passes config + SSR data into the generic client island
// -----------------------------------------------------------------------------

import PageShell from "@/components/forms/shell/page-shell";
import { headers, cookies } from "next/headers";
import type { ToolbarButton } from "@/components/forms/shell/types";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import { tallyCardsViewConfig, type TallyCardRow } from "./config";

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
const c = cookies();
const cookieHeader = c.getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
const res = await fetch(
`${base}/api/tally_cards?page=${page}&pageSize=${pageSize}`,
{
cache: "no-store",
headers: cookieHeader ? { cookie: cookieHeader } : undefined,
}
);

  let rows: TallyCardRow[] = [];
  let total = 0;

if (res.ok) {
const json = await res.json();
// Accept both shapes: {rows,total} (ours) or {data,count} (Supabase default)
const payload = json ?? {};
const parsedRows = (payload.rows ?? payload.data ?? []) as TallyCardRow[];
const parsedTotal = Number(payload.total ?? payload.count ?? parsedRows.length);
rows = parsedRows;
total = parsedTotal;
} else {
    // keep UX responsive; render empty table with zero total
    rows = [];
    total = 0;
  }

  // Simple, non-blocking toolbar defaults; you can override via your config/view-defaults
const primaryButtons: ToolbarButton[] = []; // e.g., [{ id: "new", label: "New Tally Card", href: "/forms/tally_cards/new" }]
const leftButtons:    ToolbarButton[] = []; // e.g., Print menus
const rightButtons:   ToolbarButton[] = (tallyCardsViewConfig as any)?.toolbar?.right ?? [];

  // Toolbar left cluster (Views / Columns / Sort / More Filters) is provided by PageShell by default.
  // Chips (filter/sorting) are optional toggles; left as false by default for now.

  return (
    <PageShell
      title="View Tally Cards"
      count={total}
      primaryButtons={primaryButtons}
      leftButtons={leftButtons}
      rightButtons={rightButtons}
      showFilterChip={false}
      showSortingChip={false}
      // use PageShell defaults for toolbarLeft; you can pass a custom toolbarSlot if needed
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
