# Architecture Conformance Check

This document verifies compliance with the performance guardrails defined in `performance-general.md`.

## Guardrails

### 1. SSR/API for reads; small client islands only (no browser DB access)
**Status**: ✅ **COMPLIANT**

- **SSR**: All list pages use server components with `fetchResourcePage()`
- **Client Islands**: Only `ResourceTableClient` and `ResourceListClient` are client components
- **No Browser DB**: No direct Supabase client access in browser
- **Evidence**: 
  - `src/app/(main)/forms/*/page.tsx` - All server components
  - `src/components/forms/resource-view/resource-table-client.tsx` - Client island only
  - No `createBrowserClient()` calls in client components

### 2. Use absolute URLs + forwarded cookies in SSR; end-to-end Cache-Control: no-store for list reads
**Status**: ✅ **COMPLIANT**

- **Absolute URLs**: ✅ `getServerBaseUrl()` constructs `https://host/api/...`
- **Forwarded Cookies**: ✅ `getForwardedCookieHeader()` forwards all cookies
- **Cache-Control**: ✅ `no-store` set in:
  - SSR fetch: `resource-fetch.ts:26, 37`
  - API response: `handle-list.ts:17` (via `json()` helper)
  - Client fetch: `client-fetch.ts:33`
- **Evidence**:
  ```typescript
  // resource-fetch.ts:36-40
  res = await fetch(`${base}${endpoint}?${qs.toString()}`, {
    cache: "no-store",
    next: { revalidate: 0 },
    headers: { "Cache-Control": "no-store", ...cookieHeader },
  });
  ```

### 3. List contract: { rows, total } (SSRs may accept { data, count } -> normalize)
**Status**: ✅ **COMPLIANT** (with minor redundancy)

- **API Contract**: ✅ Always returns `{ rows, total }`
- **Normalization**: ✅ `normalizeListPayload()` handles both formats (defensive)
- **SSR Usage**: ✅ Uses `{ rows, total }` directly
- **Client Usage**: ✅ Uses `{ rows, total }` directly
- **Note**: Normalization is redundant (API never returns `{data, count}`), but harmless

### 4. URL pagination is 1-based; table pagination is 0-based (must be converted deterministically)
**Status**: ✅ **COMPLIANT** (but can be optimized)

- **URL**: ✅ 1-based (`?page=1`)
- **Server**: ✅ 1-based (`page: 1`)
- **Table**: ✅ 0-based (`pageIndex: 0`)
- **Conversions**: ✅ Deterministic:
  - `page - 1` → `pageIndex` (1-based → 0-based)
  - `pageIndex + 1` → `page` (0-based → 1-based)
- **Issue**: Multiple conversion points (3 effects) can be consolidated
- **Evidence**:
  ```typescript
  // resource-table-client.tsx:423
  pageIndex: Math.max(0, page - 1)  // 1-based → 0-based
  
  // resource-table-client.tsx:1140
  const nextPage = pagination.pageIndex + 1;  // 0-based → 1-based
  ```

### 5. RLS/impersonation correctness: never cache or reuse data across sessions in a way that can leak scope
**Status**: ✅ **COMPLIANT**

- **No Caching**: ✅ `no-store` prevents caching
- **Session Context**: ✅ `getSessionContext()` reads from cookies (per-request)
- **RLS Scoping**: ✅ Applied in Supabase provider (server-side)
- **No Cross-Session Reuse**: ✅ Each request gets fresh session context
- **Evidence**:
  ```typescript
  // handle-list.ts:58
  const provider = createSupabaseServerProvider(entry.config);
  // Provider applies RLS scoping based on session context
  ```

## Conformance Summary

| Guardrail | Status | Notes |
|-----------|--------|-------|
| SSR/API for reads | ✅ Compliant | All reads via SSR/API |
| Absolute URLs + cookies | ✅ Compliant | Properly implemented |
| Cache-Control: no-store | ✅ Compliant | Set end-to-end |
| { rows, total } contract | ✅ Compliant | Consistent usage |
| 1-based URL / 0-based table | ✅ Compliant | Conversions are deterministic |
| RLS/impersonation safety | ✅ Compliant | No cross-session caching |

## Recommendations

### No Violations Found
All guardrails are properly implemented. The performance issues identified are:
- **Optimization opportunities** (duplicate work, unnecessary recalculations)
- **Not architectural violations**

### Minor Improvements
1. **Consolidate pagination conversions** - Still compliant, but can be more efficient
2. **Remove redundant normalization** - Still compliant, but unnecessary defensive code

## Conclusion

The architecture is **fully compliant** with all guardrails. Performance improvements can be made without violating any architectural constraints.





