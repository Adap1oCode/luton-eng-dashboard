// Client-side data fetching utilities
// This is a client-side equivalent of the server-side fetchResourcePage function

type ClientPageFetchArgs = {
  endpoint: string; // e.g. "/api/v_tcm_user_tally_card_entries"
  page: number;
  pageSize: number;
  extraQuery?: Record<string, string | number | undefined>;
};

export async function fetchResourcePageClient<T>({ 
  endpoint, 
  page, 
  pageSize, 
  extraQuery = {} 
}: ClientPageFetchArgs): Promise<{ rows: T[]; total: number }> {
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...Object.fromEntries(
      Object.entries(extraQuery)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ),
  });

  const res = await fetch(`${endpoint}?${qs.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    // Don't use cache for client-side requests to ensure fresh data
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch data: ${res.status} ${res.statusText}`);
  }

  const payload: any = (await res.json()) ?? {};
  const rows = (payload.rows ?? payload.data ?? []) as T[];
  const totalCandidate = Number(payload.total ?? payload.count);
  const total = Number.isFinite(totalCandidate) ? totalCandidate : rows.length;

  return { rows, total };
}
