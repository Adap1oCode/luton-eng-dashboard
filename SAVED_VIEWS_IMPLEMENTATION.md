# Saved Views Implementation Summary

## Branch
`feat/data-table-saved-views`

## Problem Statement
The Stock Adjustments page (and other table views) had unstable column state:
- Column widths and order changed after filtering or data reload
- Inline status edits triggered full route refresh, resetting table state
- No way to persist custom table layouts across sessions

## Solution Implemented

### 1. DB-Backed Saved Views
- **Table:** `public.user_saved_views` with RLS policies
- **Ownership:** Tied to `auth.users.id` (no sharing)
- **State persisted:** columnOrder, columnVisibility, columnWidthsPct, sorting, filters
- **Hydration:** Remote views loaded on mount; LocalStorage fallback for offline

### 2. Stable Column State
- **Auto-fit policy:** Only runs on first load or explicit "Auto-fit columns" button click
- **Width persistence:** Exact percentages preserved across data changes
- **Order/visibility:** Never reset unless user explicitly changes or applies a different view

### 3. Silent Background Refresh
- **No route refresh:** Inline edits (status, etc.) no longer call `router.refresh()`
- **React Query:** Background refetch with keep-previous-data semantics
- **Visual feedback:** Subtle spinner during refetch; no layout shift

### 4. Structured Filter Mapping
- **Client format:** `filters[columnId][value]` and `filters[columnId][mode]`
- **Server parsing:** Extract bracketed params in `handle-list.ts`
- **Provider application:** Apply ilike/eq/neq/startsWith/endsWith in Supabase queries

## Files Changed

### New Files
- `src/app/api/saved-views/route.ts` - GET list, POST create
- `src/app/api/saved-views/[id]/route.ts` - PATCH update, DELETE
- `scripts/add-user-saved-views.sql` - DB migration

### Modified Files
- `src/components/forms/resource-view/resource-table-client.tsx` - Integrated saved views, stable state, Views/Save UI
- `src/components/data-table/use-saved-views.ts` - Added remote hydration
- `src/components/data-table/views-menu.tsx` - Updated SavedView type
- `src/components/forms/shell/advanced-filter-bar.tsx` - Updated SavedView type
- `src/components/forms/stock-adjustments/stock-adjustments-client.tsx` - Filter mapping, React Query client
- `src/hooks/use-stock-adjustments.ts` - URLSearchParams append for bracketed filters
- `src/lib/http/list-params.ts` - Expose hidden searchParams, clamp pageSize to 500
- `src/lib/api/handle-list.ts` - Parse structured filters
- `src/lib/supabase/factory.ts` - Apply filter modes to queries
- `docs/forms-architecture-guide.md` - Added Saved Views section

## API Endpoints

### GET /api/saved-views?tableId=<id>
Returns all views for current user and specified table.

**Response:**
```json
{
  "views": [
    {
      "id": "uuid",
      "tableId": "forms/stock-adjustments",
      "name": "My View",
      "description": "Custom layout",
      "isDefault": false,
      "state": { "columnOrder": [...], "columnVisibility": {...}, ... },
      "createdAt": "2025-10-26T...",
      "updatedAt": "2025-10-26T..."
    }
  ]
}
```

### POST /api/saved-views
Create a new view.

**Request:**
```json
{
  "tableId": "forms/stock-adjustments",
  "name": "My View",
  "description": "Optional description",
  "isDefault": false,
  "state": { "columnOrder": [...], "columnVisibility": {...}, "columnWidthsPct": {...}, "sortConfig": {...}, "filters": {...} }
}
```

**Response:**
```json
{ "id": "uuid" }
```

### PATCH /api/saved-views/:id
Update view name, description, state, or set as default.

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "state": { ... },
  "isDefault": true
}
```

### DELETE /api/saved-views/:id
Delete a view (cannot delete if it's the only default).

## Database Schema

```sql
create table public.user_saved_views (
  id uuid primary key default gen_random_uuid(),
  table_id text not null,
  name text not null,
  description text,
  is_default boolean not null default false,
  owner_auth_id uuid not null,
  state_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_user_saved_views_owner_table
  on public.user_saved_views(owner_auth_id, table_id);

create unique index uq_user_saved_views_default
  on public.user_saved_views(owner_auth_id, table_id)
  where is_default = true;

-- RLS Policies
alter table public.user_saved_views enable row level security;

create policy "owner can read own views"
  on public.user_saved_views for select
  using (owner_auth_id = auth.uid());

create policy "owner can write own views"
  on public.user_saved_views for insert
  with check (owner_auth_id = auth.uid());

create policy "owner can update own views"
  on public.user_saved_views for update
  using (owner_auth_id = auth.uid());

create policy "owner can delete own views"
  on public.user_saved_views for delete
  using (owner_auth_id = auth.uid());
```

## User Experience Improvements

### Before
- Columns shifted width/order after filtering
- Status edits caused full page remount
- No way to save custom layouts
- Filter changes were jarring

### After
- Columns remain stable across all operations
- Status edits are silent (no remount)
- Users can save/load custom views
- Background refetch is seamless
- "Auto-fit columns" available on demand

## Next Steps (Post-Merge)

1. **Run SQL Migration:**
   ```bash
   # Execute scripts/add-user-saved-views.sql on Supabase
   ```

2. **Optional Enhancements:**
   - Add "Update current view" action (vs always creating new)
   - Add "Set as default" action in Views menu
   - Add dirty indicator when state diverges from applied view
   - Add keyboard shortcuts (Cmd+S to save view)

3. **Rollout to Other Tables:**
   - Tally Cards
   - Users
   - Roles
   - Products
   - All other list views

## Testing Notes

- ✅ Typecheck passed
- ✅ Lint passed (15 pre-existing warnings)
- ✅ Build passed
- ⚠️ Unit tests: 31 pre-existing failures (unrelated to this change)
  - Auth routing/callback tests
  - Tally cards schema validation
  - Resource naming conventions
- 🔄 E2E smoke tests: Not yet run (requires Supabase table creation first)

## Migration Instructions

**IMPORTANT:** Before testing in the app, run the SQL migration:

```bash
# Option 1: Via Supabase Dashboard
# Copy contents of scripts/add-user-saved-views.sql
# Paste into SQL Editor and execute

# Option 2: Via psql
psql <connection-string> -f scripts/add-user-saved-views.sql

# Option 3: Via Supabase CLI
supabase db push
```

After migration, the Stock Adjustments page will:
1. Auto-load saved views on mount
2. Preserve column state across filters/refetch
3. Allow saving custom layouts
4. Show "Auto-fit columns" in Columns menu
5. Show "Save View" button in toolbar
