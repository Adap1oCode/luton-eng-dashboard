Roles – Master Guide (CRUD + Generic Components)

This document explains how the Roles screens are structured, what each file does, how the generic DataTable stack is used, and the minimal steps to build another screen in the same style.

0) TL;DR

List view lives at /forms/roles and uses a config-driven table (config.tsx).

Row actions (Edit/Copy/Delete) are wired via a shared actions cell.

Create/Edit/Detail pages exist as App Router routes:
/forms/roles/new, /forms/roles/[id], /forms/roles/[id]/edit.

Supabase + RLS enforce access control; no server actions in v1.

When creating the next module (e.g., Orders), copy this shape and adapt only the config + queries.

1) Folder & Route Layout
src/
  app/
    (main)/
      forms/
        roles/
          README.md                    ← this file
          config.tsx                   ← list view config for columns/features/toolbar
          page.tsx                     ← LIST view (uses config + generic DataTable)
          sections/                    ← shared form/detail UI pieces for NEW, EDIT, DETAIL
            ... (existing section components)
          new/
            page.tsx                   ← CREATE form (v1 can be minimal)
          [id]/                        ← literally a folder named “[id]”
            page.tsx                   ← DETAIL view (v1 can be minimal)
            edit/
              page.tsx                 ← EDIT form (v1 can be minimal)

Why this shape?

REST-like URLs for CRUD.

sections/ shared between new, edit, and detail to avoid duplication.

List view kept small and config-driven.

2) Key Files (What each does)
config.tsx

Purpose: Pure configuration for the list view table.

Exposes:

type RoleRow – the list row shape the table renders.

rolesViewConfig – object with:

features: toggles like sortable, globalSearch, pagination, exportCsv, rowSelection, saveView, viewStorageKey.

toolbar: right-aligned toolbar buttons (e.g., New, Export).

quickFilters: optional, e.g., a status selector.

buildColumns(handlers?, includeActions?): returns ColumnDef<RoleRow>[].
When includeActions is true, appends the standardized actions column that uses the shared actions menu.

The actions column uses the reusable menu component:

import { DataTableActionsCell } from "@/components/data-table/data-table-actions-cell";

// inside buildColumns(...)
{
  id: "actions",
  header: () => null,
  enableSorting: false,
  cell: ({ row }) => (
    <DataTableActionsCell
      wrapper="div" // IMPORTANT when inside TanStack cells
      onEdit={handlers?.onEdit ? () => handlers.onEdit!(row.original) : undefined}
      onCopy={handlers?.onCopy ? () => handlers.onCopy!(row.original) : undefined}
      onDelete={handlers?.onDelete ? () => handlers.onDelete!(row.original) : undefined}
    />
  ),
}


This keeps list-specific logic out of the page, and reuses generic table parts.

page.tsx (List view)

Purpose: Fetch data from Supabase, normalize to RoleRow[], apply quick filters & table state, render the generic DataTable.

Fetch/normalize:

roles: id, role_code, role_name, is_active

role_warehouse_rules: role_code, warehouse
→ Build a map of role_code → string[] warehouses.

State & table:

globalFilter, sorting, columnVisibility, rowSelection.

Persist column visibility if saveView + viewStorageKey are configured.

Quick filter (“status”) applied before passing rows to TanStack.

Toolbar:

Renders buttons from rolesViewConfig.toolbar.right.

Handles export via local exportCsv() when button id is "exportCsv".

Actions wiring (so Edit/Copy/Delete work):

const onEdit = (row: RoleRow) => router.push(`/forms/roles/${row.id}/edit`);

const onCopy = async (row: RoleRow) => {
  // 1) insert copy in roles
  // 2) (best-effort) duplicate its role_warehouse_rules
  // 3) toast + route to the new record’s edit page
};

const onDelete = async (row: RoleRow) => {
  // confirm → DELETE roles where id = row.id
  // update local state & toast
};

const columns = React.useMemo(() =>
  rolesViewConfig.buildColumns({ onEdit, onCopy, onDelete }, true),
[onEdit]);


Renders generic table stack:

<DataTableViewOptions table={table} />
<BaseDataTable table={table} />
<DataTablePagination table={table} />

sections/ (shared form & detail UI)

Purpose: Reusable UI pieces between new, edit, detail pages.
Examples: GeneralSection.tsx, PermissionsSection.tsx, etc.
V1 can keep these as-is; round two can standardize with a tiny FieldList helper.

new/page.tsx (Create)

Purpose: Minimal form to create a role (v1 can be simple).

Typically:

Render a form with your existing section components.

On submit → supabase.from("roles").insert(...).

Respect RLS: only permitted users can create.

After save → redirect to /forms/roles/[id] or /edit.

[id]/page.tsx (Detail)

Purpose: Basic detail view for a single role.

Fetch role by params.id.

Render the values (using sections/ or minimal placeholders).

Optionally show related tables (e.g., warehouse rules) as a sub-table (reuse the generic DataTable).

[id]/edit/page.tsx (Update)

Purpose: Edit form for a role.

Fetch existing record by params.id.

Render section components with populated defaults.

On submit → supabase.from("roles").update(...).eq("id", id).

RLS will enforce who can update.

3) Generic Table Components (shared across screens)

All located under src/components/data-table/. Keep these stable for v1.

data-table.tsx
TanStack Table renderer:

Sticky header, optional filter row (parent-driven), optional DnD rows (dnd-kit).

Props:

table: TanStack instance (useReactTable).

Optional filters & setFilters (for column-level filtering UIs).

Optional DnD props: dndEnabled, dataIds, handleDragEnd, sensors, sortableId.

Default “filter row” shows if filters+setFilters provided.
You can target columns via filterOnlyIds and skip logic (already integrated).

data-table-pagination.tsx
Pagination controls for the TanStack table.

data-table-view-options.tsx
Column visibility toggle & view options (the “eye” menu).

data-table-column-header.tsx
Standardized header cell (sort indicators, etc.).

draggable-row.tsx, drag-column.tsx
Helpers for optional row drag-and-drop.

cell-viewer.tsx (if present)
A generic cell content helper (formatting, truncation, etc.).

data-table-actions-cell.tsx (Important)
Reusable row actions menu.

Use wrapper="div" when rendering inside a TanStack column cell (to avoid nested <td>).

Use wrapper="td" for legacy/manual tables.

Props:

onEdit?: () => void;
onCopy?: () => void;
onFavorite?: () => void;
onDelete?: () => void;
label?: string;
sticky?: boolean; // only for wrapper="td"
wrapper?: "td" | "div"; // default "td"

4) Data & Security

Supabase is the source of truth.

RLS (Row-Level Security) policies control who can SELECT, INSERT, UPDATE, DELETE.

Ensure roles and role_warehouse_rules have:

A permissive SELECT policy for authenticated viewers (or narrower as needed).

Writer policies tied to your admin roles (e.g., u.is_roles_admin).

The client calls Supabase directly for CRUD in v1.
Round two can move destructive or multi-table operations (e.g., deep copy) into server actions for auditing/validation.

5) Building Another Screen (Copy this pattern)

Create folder: src/app/(main)/forms/<entity>/.

Add config.tsx:

Define Row type (list row)

Build columns with a final actions column that uses DataTableActionsCell (wrapper="div").

Set feature flags & toolbar buttons.

Add page.tsx:

Fetch & normalize rows.

Apply quick filter(s) if needed.

Build table via useReactTable and render:

<DataTableViewOptions table={table} />
<DataTable table={table} />
<DataTablePagination table={table} />


Wire onEdit, onCopy, onDelete and pass into buildColumns(...).

Add routes:

/new/page.tsx (create)

/[id]/page.tsx (detail)

/[id]/edit/page.tsx (update)

Confirm RLS policies cover your CRUD.

6) Common Gotchas (and answers)

Action menu inside TanStack cell → Always pass wrapper="div" to DataTableActionsCell.
Using <td> here causes invalid nested cells.

Column visibility persistence → Works when features.saveView is true and viewStorageKey is supplied in config.tsx.

Export CSV → Implemented in the list page (page.tsx). It exports visible columns from the filtered/sorted row model.

Realtime updates → The list view subscribes to changes on roles and role_warehouse_rules. If you add more relations later, add them to the channel.

Sorting or filtering not working → Ensure the column definition sets enableSorting (and enableColumnFilter if using manual filter UIs).

RLS permission denied → Check your policies. For deletes/updates, confirm your user matches the admin predicate.

7) Minimal Checklists
Before commit (Roles v1)

 /forms/roles list works with search/sort/export.

 Actions menu present; clicking Edit/Copy/Delete behaves as expected.

 Routes exist: /forms/roles/new, /forms/roles/[id], /forms/roles/[id]/edit (placeholders OK).

 RLS policies allow the intended CRUD operations.

For the next entity (e.g., Orders)

 Copied folder structure.

 Config created (columns/features/toolbar).

 List page.tsx hooked to queries and using generic DataTable.

 CRUD routes created and wired.

 RLS validated for the new tables.

8) Round Two (what we’ll do later, not now)

Add small EntityScreen + Section skeleton components for consistent detail/edit layouts.

Introduce a tiny FieldList so detail sections are pure config arrays (less JSX).

Extract CSV + view persistence to tiny utils.

Migrate destructive operations (delete/copy) to server actions + audit logging.

Contact points (quick references)

Generic table: src/components/data-table/*

Actions cell: src/components/data-table/data-table-actions-cell.tsx

List config: src/app/(main)/forms/roles/config.tsx

List page: src/app/(main)/forms/roles/page.tsx

Routes: src/app/(main)/forms/roles/new/, src/app/(main)/forms/roles/[id]/, src/app/(main)/forms/roles/[id]/edit/

This is the reference for the Roles module v1. Use it as the baseline template for the next entity.