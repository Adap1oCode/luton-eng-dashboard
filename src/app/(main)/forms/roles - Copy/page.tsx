"use client";

import * as React from "react";
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { supabaseBrowser } from "@/lib/supabase";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { DataTable as BaseDataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";

import {
  rolesViewConfig,
  type RoleRow,
} from "./config";

/* -----------------------------------------------------------------------------
 * Fetch + normalize
 * ---------------------------------------------------------------------------*/
async function fetchRoles(supabase: ReturnType<typeof supabaseBrowser>): Promise<RoleRow[]> {
  const [{ data: roleRows, error: roleErr }, { data: ruleRows, error: ruleErr }] = await Promise.all([
    supabase.from("roles").select("id, role_code, role_name, is_active").order("role_code", { ascending: true }),
    supabase.from("role_warehouse_rules").select("role_code, warehouse"),
  ]);
  if (roleErr) throw roleErr;
  if (ruleErr) throw ruleErr;

  const map = new Map<string, string[]>();
  (ruleRows ?? []).forEach((r: any) => {
    const code = String(r.role_code ?? "").trim();
    const wh   = String(r.warehouse ?? "").trim();
    if (!code || !wh) return;
    const list = map.get(code) ?? [];
    if (!list.includes(wh)) list.push(wh);
    map.set(code, list);
  });
  for (const [k, v] of map) map.set(k, [...v].sort((a, b) => a.localeCompare(b)));

  return (roleRows ?? []).map((r: any) => ({
    id: r.id,
    role_code: String(r.role_code ?? "").trim(),
    role_name: String(r.role_name ?? "").trim(),
    warehouses: map.get(String(r.role_code ?? "").trim()) ?? [],
    is_active: Boolean(r.is_active),
  }));
}

/* -----------------------------------------------------------------------------
 * Page
 * ---------------------------------------------------------------------------*/
export default function RolesViewPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();
  const { features, toolbar, quickFilters, buildColumns } = rolesViewConfig;

  // Data
  const [rows, setRows] = React.useState<RoleRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Table UI state
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Quick filter state (status)
  const defaultStatus =
    (quickFilters.find((f) => f.id === "status" && "defaultValue" in f) as any)?.defaultValue ?? "ALL";
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "ACTIVE" | "INACTIVE">(defaultStatus);

  // Columns from config (actions column included)
  const columns = React.useMemo<ColumnDef<RoleRow, any>[]>(() => buildColumns(true), [buildColumns]);

  // Load + realtime
  React.useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true); setError(null);
      try {
        const data = await fetchRoles(supabase);
        if (mounted) setRows(data);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Failed to load roles");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    const ch = supabase
      .channel("roles-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "roles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "role_warehouse_rules" }, load)
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [supabase]);

  // Client-side status filter (applied before table rows fed into TanStack)
  const filteredRows = React.useMemo(() => {
    if (statusFilter === "ALL") return rows;
    const wantActive = statusFilter === "ACTIVE";
    return rows.filter((r) => r.is_active === wantActive);
  }, [rows, statusFilter]);

  // Persist / restore column visibility (Save View)
  React.useEffect(() => {
    if (!features.saveView || !features.viewStorageKey) return;
    try {
      const raw = localStorage.getItem(features.viewStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.columnVisibility) setColumnVisibility(parsed.columnVisibility);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!features.saveView || !features.viewStorageKey) return;
    try {
      localStorage.setItem(features.viewStorageKey, JSON.stringify({ columnVisibility }));
    } catch { /* ignore */ }
  }, [columnVisibility, features.saveView, features.viewStorageKey]);

  // Build table instance
  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting, globalFilter, columnVisibility, rowSelection },
    enableRowSelection: !!features.rowSelection,
    onSortingChange: features.sortable ? setSorting : undefined,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: features.sortable ? getSortedRowModel() : undefined,
    getPaginationRowModel: features.pagination ? getPaginationRowModel() : undefined,
  });

  // Toolbar actions mapping (config → handlers)
  const handleToolbarClick = (id: string, href?: string) => {
    if (href) return router.push(href);
    if (id === "export" || id === "exportCsv") return exportCsv();
    if (id === "new") return router.push("/forms/roles");
    // add more ids as needed
  };

  // Export CSV (visible columns, filtered/sorted rows)
  const exportCsv = () => {
    if (!features.exportCsv) return;
    const visibleCols = table.getAllLeafColumns().filter((c) => c.getIsVisible());
    if (!visibleCols.length) return toast.error("No visible columns to export");

    const header = visibleCols
      .map((c) => (typeof c.columnDef.header === "string" ? c.columnDef.header : String(c.id)))
      .join(",");

    const body = table.getRowModel().rows
      .map((r) =>
        visibleCols
          .map((c) => {
            const cell = r.getValue(c.id);
            const txt =
              typeof cell === "string"
                ? cell
                : typeof cell === "number"
                ? String(cell)
                : (cell as any)?.props?.children ?? String(cell ?? "");
            return `"${String(txt).replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\n");

    const csv = [header, body].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `roles_export_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Exported ${table.getRowModel().rows.length} row(s)`);
  };

  /* -----------------------------------------------------------------------------
   * Render
   * ---------------------------------------------------------------------------*/
  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="w-full space-y-6 p-4 sm:p-6">
          <div className="rounded-lg bg-white p-6 text-center shadow-sm dark:bg-gray-800">Loading…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background min-h-screen">
        <div className="w-full space-y-6 p-4 sm:p-6">
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
            <h1 className="text-xl font-semibold text-red-600 sm:text-2xl">Failed to load roles</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <div className="mt-4">
              <Button variant="outline" onClick={() => location.reload()}>Retry</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="w-full space-y-6 p-4 sm:p-6">
        {/* Header / Toolbar */}
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold sm:text-2xl">View All Roles</h1>

            <div className="flex flex-wrap items-center gap-2">
              {features.globalSearch && (
                <Input
                  placeholder="Search code, name, or warehouse…"
                  value={globalFilter ?? ""}
                  onChange={(e) => table.setGlobalFilter(e.target.value)}
                  className="w-[260px]"
                />
              )}

              {/* Quick filter (status) */}
              <Select
                value={statusFilter}
                onValueChange={(v: "ALL" | "ACTIVE" | "INACTIVE") => {
                  setStatusFilter(v);
                  table.setPageIndex(0);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active only</SelectItem>
                  <SelectItem value="INACTIVE">Inactive only</SelectItem>
                </SelectContent>
              </Select>

              {/* Column visibility / density etc. */}
              <DataTableViewOptions table={table} />

              {/* Toolbar buttons from config */}
              {rolesViewConfig.toolbar.right?.map((btn) => (
                <Button
                  key={btn.id}
                  variant={btn.variant ?? "default"}
                  onClick={() => handleToolbarClick(btn.onClickId ?? btn.id, btn.href)}
                >
                  {btn.icon ? <btn.icon className="mr-2 h-4 w-4" /> : null}
                  {btn.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-gray-800">
          <BaseDataTable table={table} />
        </div>

        {/* Pagination */}
        {features.pagination && <DataTablePagination table={table} />}
      </div>
    </div>
  );
}
