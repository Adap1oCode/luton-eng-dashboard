# Stock Adjustments Edit Screen - Runtime File Documentation

**URL**: `/forms/stock-adjustments/[id]/edit`  
**Example**: `http://localhost:3001/forms/stock-adjustments/489243bb-ed84-489f-846f-2ef9cc7872d7/edit`  
**Last Updated**: 2025-01-28

This document lists **all files** that are executed/loaded when the Stock Adjustments Edit screen is accessed, organized by execution phase.

---

## Execution Phases

The screen execution follows this flow:
1. **Next.js Route Resolution** → Server Component rendering
2. **Server-Side Rendering (SSR)** → Data fetching, config preparation
3. **API Route Handlers** → GET request for existing record
4. **Client-Side Hydration** → React hydration, form initialization
5. **User Interaction** → Form submission, API POST request
6. **Submit Response** → Success/error handling, redirect

---

## 1. Next.js Route Resolution

### Route Handler (Entry Point)
- **File**: `src/app/(main)/forms/stock-adjustments/[id]/edit/page.tsx`
- **Type**: Server Component (async)
- **Purpose**: Main entry point for the edit page
- **Responsibilities**:
  - Extracts `id` from URL params
  - Calls `getRecordForEdit()` to fetch existing record
  - Prepares form config (strips non-serializable functions)
  - Renders `ResourceFormSSRPage` with prepared data

---

## 2. Server-Side Rendering (SSR)

### Form Configuration
- **File**: `src/app/(main)/forms/stock-adjustments/new/form.config.ts`
- **Type**: TypeScript module
- **Purpose**: Defines form schema, fields, sections, and validation rules
- **Exported**: `stockAdjustmentCreateConfig` (shared for create/edit)

### Record Loading Utility
- **File**: `src/lib/forms/get-record-for-edit.ts`
- **Type**: Server utility function
- **Purpose**: Fetches existing record from API and prepares defaults
- **Calls**: 
  - `ensureSections()` from config-normalize
  - `getAllFields()` from config-normalize
  - `buildDefaults()` from schema
  - `serverRequestMeta()` from server-helpers
  - `serverFetchJson()` from server-helpers

### Config Normalization
- **File**: `src/lib/forms/config-normalize.ts`
- **Type**: Utility module
- **Exported Functions**:
  - `getAllFields()` - Extracts all fields from config (sections or flat)
  - `ensureSections()` - Normalizes config to have sections structure
  - `widthToSpan()` - Maps legacy width hints to column spans

### Schema Building
- **File**: `src/lib/forms/schema.ts`
- **Type**: Utility module
- **Exported Functions**:
  - `buildZodFromField()` - Converts field def to Zod type
  - `buildSchema()` - Builds complete Zod schema from config
  - `buildDefaults()` - Builds default values object from config

### Server Helpers
- **File**: `src/lib/next/server-helpers.ts`
- **Type**: Server utility module
- **Exported Functions**:
  - `awaitParams()` - Safely awaits Next.js 15 route params
  - `serverRequestMeta()` - Gets base URL, headers, cookies for SSR
  - `serverFetchJson()` - Server-side fetch with cookie forwarding

### Form SSR Page Component
- **File**: `src/components/forms/form-view/resource-form-ssr-page.tsx`
- **Type**: Server Component
- **Purpose**: Generic SSR wrapper for edit forms
- **Dependencies**:
  - `FormIsland` (client component)
  - `FormShellWithLoading` (client component)
  - `PermissionGate` (client component)
  - `Link` from `next/link`

### Form Shell with Loading
- **File**: `src/components/forms/shell/form-shell-with-loading.tsx`
- **Type**: Client Component (marked "use client")
- **Purpose**: Wraps FormShell with loading states
- **Dependencies**:
  - `FormShell` (server component)
  - `FullScreenLoader` from enhanced-loader
  - `BackgroundLoader` from background-loader

### Form Shell
- **File**: `src/components/forms/shell/form-shell.tsx`
- **Type**: Server Component
- **Purpose**: Shared shell layout for forms (header card, footer actions)
- **Renders**: Page structure with header card and footer

### Permission Gate
- **File**: `src/components/auth/permissions-gate.tsx`
- **Type**: Client Component
- **Purpose**: Permission-based access control
- **Dependencies**:
  - `useSWR` from `swr`
  - `hasAll`, `hasAny` from `@/lib/permissions`
  - Fetches from `/api/me/permissions`

### Form Island (Client Component)
- **File**: `src/components/forms/shell/form-island.tsx`
- **Type**: Client Component ("use client")
- **Purpose**: Client form wrapper with submission logic
- **Dependencies**:
  - `DynamicForm` component
  - `useNotice` hook
  - `BackgroundLoader` component
  - `extractErrorMessage` utility
  - `useRouter` from `next/navigation`

### Dynamic Form
- **File**: `src/components/forms/dynamic-form.tsx`
- **Type**: Client Component ("use client")
- **Purpose**: Dynamic form renderer using react-hook-form
- **Dependencies**:
  - `react-hook-form` (`useForm`, `FormProvider`, `zodResolver`)
  - `@hookform/resolvers/zod`
  - `SectionCard` component
  - `DynamicField` component
  - `buildSchema` from `@/lib/forms/schema`

### Section Card
- **File**: `src/components/forms/shell/section-card.tsx`
- **Type**: Client Component ("use client")
- **Purpose**: Collapsible section card for form sections
- **Dependencies**:
  - `ChevronUp`, `ChevronDown` from `lucide-react`

### Dynamic Field
- **File**: `src/components/forms/dynamic-field.tsx`
- **Type**: Client Component ("use client")
- **Purpose**: Renders individual form fields based on field definition
- **Dependencies**:
  - `react-hook-form` (`Controller`, `useFormContext`)
  - Supports: text, number, textarea, select, multiselect, date, checkbox

### Form Types
- **File**: `src/lib/forms/types.ts`
- **Type**: TypeScript type definitions
- **Purpose**: Shared type definitions for form configs, fields, options

### Error Extraction
- **File**: `src/lib/forms/extract-error.ts`
- **Type**: Utility function
- **Purpose**: Extracts error messages from API responses

### UI Components

#### Notice Provider
- **File**: `src/components/ui/notice.tsx`
- **Type**: Client Component
- **Purpose**: Toast/alert notification system
- **Dependencies**:
  - `AlertDialog` components from `@/components/ui/alert-dialog`

#### Background Loader
- **File**: `src/components/ui/background-loader.tsx`
- **Type**: Client Component
- **Purpose**: Non-blocking loading indicator
- **Dependencies**:
  - `class-variance-authority` (`cva`)
  - `cn` utility from `@/lib/utils`

#### Enhanced Loader (FullScreenLoader)
- **File**: `src/components/ui/enhanced-loader.tsx`
- **Type**: Client Component
- **Purpose**: Full-screen loading overlay
- **Dependencies**:
  - `class-variance-authority` (`cva`)
  - `cn` utility from `@/lib/utils`

---

## 3. API Route Handlers (Data Fetching)

### GET Single Record Handler
- **File**: `src/app/api/[resource]/[id]/route.ts`
- **Type**: API Route Handler
- **Method**: `GET`
- **Purpose**: Generic handler for fetching single records
- **Dependencies**:
  - `getOneHandler` from `@/lib/api/handle-item`
  - `awaitParams`, `AwaitableParams` from server-helpers
  - `withLogging` from `@/lib/obs/with-logging`

### Item Handler Implementation
- **File**: `src/lib/api/handle-item.ts`
- **Type**: API utility module
- **Functions**:
  - `getOneHandler()` - Fetches single record
  - `updateHandler()` - Updates record (not used in edit flow)
  - `deleteHandler()` - Deletes record (not used in edit flow)
- **Dependencies**:
  - `resolveResource` from `@/lib/api/resolve-resource`
  - `createSupabaseServerProvider` from `@/lib/supabase/factory`

### Resource Resolution
- **File**: `src/lib/api/resolve-resource.ts`
- **Type**: Utility module
- **Purpose**: Maps UI resource keys (e.g., "stock-adjustments") to backend resources (e.g., "tcm_user_tally_card_entries")

### Supabase Factory
- **File**: `src/lib/supabase/factory.ts`
- **Type**: Utility module
- **Functions**:
  - `createSupabaseProvider()` - Creates data provider
  - `createSupabaseServerProvider()` - Creates server-side provider
- **Dependencies**:
  - `@/lib/supabase-server` for server client
  - `@/lib/supabase` for browser client (not used in SSR)

### Supabase Server Client
- **File**: `src/lib/supabase-server.ts`
- **Type**: Server-only module
- **Purpose**: Creates server-side Supabase client with cookie forwarding
- **Dependencies**:
  - `next/headers` (`cookies`)
  - `@supabase/ssr` (`createServerClient`)

---

## 4. Client-Side Hydration

All client components listed in Section 2 are hydrated here. No additional files are loaded during hydration.

---

## 5. User Interaction (Form Submission)

### Form Submission Handler
- **File**: `src/components/forms/shell/form-island.tsx`
- **Function**: `onSubmit` handler (lines 62-112)
- **Flow**:
  1. Validates form hasn't been submitted
  2. Checks if `config.submit` is a function (not used in edit)
  3. Falls back to HTTP fetch using `config.method` and `config.action`
  4. For edit: POST to `/api/stock-adjustments/[id]/actions/patch-scd2`
  5. Handles success/error and redirects

### SCD-2 Patch Route
- **File**: `src/app/api/stock-adjustments/[id]/actions/patch-scd2/route.ts`
- **Type**: API Route Handler
- **Method**: `POST`
- **Purpose**: Custom endpoint for SCD-2 (Slowly Changing Dimension Type 2) updates
- **Dependencies**:
  - `awaitParams` from server-helpers
  - `createSupabaseServerClient` from `@/lib/supabase-server`
  - Calls RPC function: `fn_user_entry_patch_scd2`

### RPC Call
- **Database Function**: `fn_user_entry_patch_scd2`
- **Type**: Supabase RPC function
- **Parameters**:
  - `p_id` - Record ID
  - `p_qty` - Quantity value
  - `p_location` - Location value
  - `p_note` - Note value
- **Returns**: New record (SCD-2 creates new row, preserves history)

---

## 6. Response Handling

### Success Path
1. `FormIsland` receives successful response from patch-scd2 route
2. Checks `config.redirectTo` function (not used in edit)
3. Falls back to inferred redirect: `/forms/stock-adjustments` (list page)
4. Uses `router.push()` from `next/navigation`

### Error Path
1. `FormIsland` catches error from fetch
2. Calls `extractErrorMessage()` to parse error response
3. Shows error via `notice.open()` (AlertDialog)
4. User can dismiss and retry

---

## File Count Summary

### Server Components & Pages
- 1 page component
- 2 server utility modules (get-record-for-edit, server-helpers)
- 3 form utility modules (config-normalize, schema, types)
- 1 API route handler (GET)

### Client Components
- 8 form-related components (ResourceFormSSRPage, FormShellWithLoading, FormShell, FormIsland, DynamicForm, SectionCard, DynamicField, PermissionGate)
- 3 UI components (Notice, BackgroundLoader, EnhancedLoader)

### API Routes
- 1 generic route handler ([resource]/[id])
- 1 custom route handler (patch-scd2)

### Utilities & Infrastructure
- 3 API utilities (handle-item, resolve-resource, supabase factory)
- 1 Supabase server client
- 1 error extraction utility

### Configuration
- 1 form config file

**Total**: ~25-30 files actively used during runtime

---

## Key Runtime Flow

```
1. User navigates to /forms/stock-adjustments/[id]/edit
   ↓
2. Next.js routes to page.tsx (Server Component)
   ↓
3. page.tsx calls getRecordForEdit()
   ↓
4. getRecordForEdit() calls serverFetchJson('/api/stock-adjustments/[id]')
   ↓
5. GET /api/[resource]/[id] → getOneHandler()
   ↓
6. getOneHandler() → resolveResource() → createSupabaseServerProvider()
   ↓
7. Provider fetches from Supabase (with RLS/scoping)
   ↓
8. Data returns to page.tsx → ResourceFormSSRPage → FormShellWithLoading → FormIsland
   ↓
9. FormIsland → DynamicForm → SectionCard → DynamicField
   ↓
10. User submits form
    ↓
11. FormIsland POSTs to /api/stock-adjustments/[id]/actions/patch-scd2
    ↓
12. patch-scd2 route calls Supabase RPC fn_user_entry_patch_scd2
    ↓
13. Success → router.push('/forms/stock-adjustments')
    Error → notice.open() shows AlertDialog
```

---

## Notes

- All server-side code runs in Node.js environment
- All client components run in browser after hydration
- Form config (`form.config.ts`) is shared between create and edit pages
- SCD-2 pattern means edits create new records, preserving history
- RLS (Row Level Security) is enforced at Supabase level
- Permission gating happens at UI level (PermissionGate component)


