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

  let res: Response;
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    res = await fetch(`${base}${endpoint}?${qs.toString()}`, {
      // Enable caching for better performance
      cache: "force-cache",
      next: { revalidate: 300 }, // Revalidate every 5 minutes
      headers: cookieHeader,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
  } catch (error) {
    console.warn("Resource fetch failed:", error);
    return { rows: [], total: 0 };
  }

  if (!res.ok) {
    let errorBody: any = {};
    let errorText: string = "";
    try {
      const text = await res.text();
      errorText = text;
      try {
        errorBody = JSON.parse(text);
      } catch {
        // Not JSON, use text as error
        errorBody = { message: text || "Unknown error" };
      }
    } catch (e) {
      errorBody = { message: "Failed to read error response" };
    }
    
    console.error(`[fetchResourcePage] API error for ${endpoint}:`, {
      status: res.status,
      statusText: res.statusText,
      url: `${base}${endpoint}?${qs.toString()}`,
      errorBody,
      errorText: errorText.substring(0, 500), // First 500 chars
    });
    return { rows: [], total: 0 };
  }

  const payload: any = (await res.json()) ?? {};
  console.log(`[fetchResourcePage] Response for ${endpoint}:`, {
    hasRows: !!payload.rows,
    hasData: !!payload.data,
    rowsCount: payload.rows?.length ?? 0,
    dataCount: payload.data?.length ?? 0,
    total: payload.total ?? payload.count,
    payloadKeys: Object.keys(payload),
  });
  
  const rows = (payload.rows ?? payload.data ?? []) as T[];
  const totalCandidate = Number(payload.total ?? payload.count);
  const total = Number.isFinite(totalCandidate) ? totalCandidate : rows.length;

  return { rows, total };
}
