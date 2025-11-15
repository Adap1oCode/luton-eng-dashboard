# Runtime Trace: App-Level Data Flow

This document traces the complete data flow from SSR page load through API to client rendering, including all pagination conversions and cache/cookie handling.

## Data Flow Chain

### 1. SSR Page (Server Component)
**File**: `src/app/(main)/forms/stock-adjustments/page.tsx`

**Input**: URL search params (`?page=1&pageSize=50`)

**Process**:
1. `resolveSearchParams()` - Resolves Next.js search params
2. `parseListParams()` - Parses pagination (1-based: `page=1`) and filters
3. Builds `extraQuery` from quick filters (e.g., `statusToQuery()`)
4. Calls `fetchResourcePage()` with absolute URL

**Output**: `{ rows, total, page, pageSize }` (1-based pagination)

**Cache/Cookies**:
- Uses `getServerBaseUrl()` → absolute URL (`https://host/api/...`)
- Uses `getForwardedCookieHeader()` → forwards all cookies
- Sets `Cache-Control: no-store` in headers

---

### 2. SSR Fetch Helper
**File**: `src/lib/data/resource-fetch.ts` → `fetchResourcePage()`

**Input**: `{ endpoint, page, pageSize, extraQuery }`

**Process**:
1. Gets base URL from headers (`x-forwarded-proto` + `host`)
2. Gets cookie header from `cookies()`
3. Builds query string with `page` (1-based), `pageSize`, and `extraQuery`
4. Fetches `${base}${endpoint}?page=1&pageSize=50&...` with:
   - `cache: "no-store"`
   - `next: { revalidate: 0 }`
   - Headers: `{ "Cache-Control": "no-store", cookie: "..." }`

**Output**: `{ rows: T[], total: number }`

**Cache/Cookies**:
- ✅ Absolute URL construction
- ✅ Cookie forwarding via headers
- ✅ `no-store` cache control

---

### 3. API Route Handler
**File**: `src/app/api/[resource]/route.ts` → `GET()`

**Input**: Request with URL params and cookies

**Process**:
1. Extracts `resource` from route params
2. Calls `listHandler(req, resource)`

**Cache/Cookies**:
- Cookies automatically forwarded by Next.js
- Response includes `Cache-Control: no-store` (via `json()` helper)

---

### 4. List Handler
**File**: `src/lib/api/handle-list.ts` → `listHandler()`

**Input**: Request with URL and cookies

**Process**:
1. `parseListQuery(url)` - Parses `page` (1-based), `pageSize`, filters
2. Extracts structured filters: `filters[col][value]`, `filters[col][mode]`
3. Creates Supabase provider with session context (RLS scoping)
4. Calls `provider.list({ q, page, pageSize, activeOnly, filters })`
5. Applies `toRow()` transformation if configured
6. Returns `{ rows, total, page, pageSize, resource, raw }`

**Output**: `{ rows: any[], total: number, page: number, pageSize: number }`

**Cache/Cookies**:
- ✅ `json()` helper sets `Cache-Control: no-store`
- ✅ Session context from cookies (RLS/impersonation)

---

### 5. Client Component (React Query)
**File**: `src/components/forms/resource-view/resource-table-client.tsx`

**Input**: `{ initialRows, initialTotal, page, pageSize }` from SSR

**Process**:
1. **Pagination Conversion (1-based → 0-based)**:
   ```typescript
   const [pagination, setPagination] = useState({
     pageIndex: Math.max(0, page - 1),  // 1-based → 0-based
     pageSize,
   });
   ```

2. **React Query Setup**:
   - `queryKey`: `[endpointKey, page, pageSize, serializedFilters]`
   - `queryFn`: Calls `fetchResourcePageClient()` (duplicate fetch on initial load)
   - `initialData`: Uses SSR data `{ rows: initialRows, total: initialTotal }`
   - `staleTime`: 5 minutes

3. **URL Sync Effect** (0-based → 1-based):
   ```typescript
   useEffect(() => {
     const nextPage = pagination.pageIndex + 1;  // 0-based → 1-based
     // Updates URL with ?page=${nextPage}
   }, [pagination.pageIndex, pagination.pageSize]);
   ```

4. **SSR Sync Effect** (1-based → 0-based):
   ```typescript
   useEffect(() => {
     setPagination({
       pageIndex: Math.max(0, page - 1),  // 1-based → 0-based
       pageSize,
     });
   }, [page, pageSize]);
   ```

**Output**: Rendered table with TanStack Table (0-based `pageIndex`)

**Cache/Cookies**:
- Client fetch uses `cache: 'no-store'` (no cookies needed - browser handles)
- React Query cache with 5min staleTime

---

## Pagination Conversion Map

| Location | Conversion | Input | Output | Trigger |
|----------|-----------|-------|--------|---------|
| `resource-table-client.tsx:423` | 1-based → 0-based | `page: 1` (SSR prop) | `pageIndex: 0` (state) | Component mount |
| `resource-table-client.tsx:1140` | 0-based → 1-based | `pageIndex: 0` (state) | `page: 1` (URL) | Pagination change |
| `resource-table-client.tsx:1166` | 1-based → 0-based | `page: 1` (SSR prop) | `pageIndex: 0` (state) | SSR props change |
| `data-table-pagination.tsx:27` | 0-based → 1-based | `pageIndex: 0` (table) | `currentPage: 1` (display) | Render |
| `data-table-pagination.tsx:45` | 1-based → 0-based | `page: 1` (user input) | `pageIndex: 0` (table) | User clicks page |

**Issue**: Multiple conversion points create potential feedback loops and unnecessary recalculations.

---

## Cookie & Cache Flow

### Server-Side (SSR)
1. **Headers Extraction**: `headers()` → `x-forwarded-proto`, `host`
2. **Cookie Extraction**: `cookies()` → all cookies
3. **Absolute URL**: `${proto}://${host}/api/...`
4. **Cookie Header**: `cookie: "name1=value1; name2=value2"`
5. **Cache Control**: `Cache-Control: no-store` in request headers

### API Route
1. **Cookie Forwarding**: Automatic via Next.js (cookies in request)
2. **Session Context**: `getSessionContext()` reads cookies for RLS
3. **Response Cache**: `Cache-Control: no-store` in response headers

### Client-Side
1. **Initial Data**: Uses SSR data (no fetch on mount if params match)
2. **Subsequent Fetches**: `cache: 'no-store'` in fetch options
3. **React Query Cache**: 5min staleTime, but still refetches on mount

**Issue**: React Query refetches even with `initialData` and `staleTime: 5min`, causing duplicate network request.

---

## Data Shape Transformations

| Hop | Input Shape | Output Shape | Transformation |
|-----|-------------|--------------|---------------|
| SSR Page | URL params | `{ rows, total }` | `fetchResourcePage()` |
| API Handler | Request | `{ rows, total, page, pageSize }` | `toRow()` if configured |
| Client Fetch | API response | `{ rows, total }` | `normalizeListPayload()` |
| React Query | `initialData` | `{ rows, total }` | Uses SSR data |
| Table State | `initialRows` | `filteredRows` | Filters optimistic deletes |

**Issue**: `normalizeListPayload()` handles both `{rows, total}` and `{data, count}`, but API always returns `{rows, total}`, so normalization is redundant.

---

## Key Issues Identified

1. **Duplicate Fetch**: SSR fetches data, then React Query refetches on mount (even with `initialData`)
2. **Pagination Conversions**: Multiple conversion points (3 effects) can create feedback loops
3. **Filter Parsing**: Server parses filters, client re-parses from URL
4. **Filter Logic**: Server builds `extraQuery`, client rebuilds same `extraQuery`
5. **Column Memoization**: Column building recalculates unnecessarily








