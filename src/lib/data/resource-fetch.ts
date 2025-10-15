import { getServerBaseUrl, getForwardedCookieHeader } from "@/lib/ssr/http";

type PageFetchArgs = {
  endpoint: string; // e.g. "/api/user_tally_card_entries"
  page: number;
  pageSize: number;
  extraQuery?: Record<string, string | number | undefined>;
};

export async function fetchResourcePage<T>({ endpoint, page, pageSize, extraQuery = {} }: PageFetchArgs)
: Promise<{ rows: T[]; total: number }> {
  const base = await getServerBaseUrl();
  const cookieHeader = await getForwardedCookieHeader();

  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...Object.fromEntries(
      Object.entries(extraQuery)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ),
  });

  const res = await fetch(`${base}${endpoint}?${qs.toString()}`, {
    cache: "no-store",
    headers: cookieHeader,
  });

  if (!res.ok) return { rows: [], total: 0 };

  const payload: any = (await res.json()) ?? {};
  const rows = (payload.rows ?? payload.data ?? []) as T[];
  const totalCandidate = Number(payload.total ?? payload.count);
  const total = Number.isFinite(totalCandidate) ? totalCandidate : rows.length;

  return { rows, total };
}
