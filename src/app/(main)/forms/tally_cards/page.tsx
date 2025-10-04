// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally_cards/page.tsx
// PURPOSE: "View All Tally Cards" screen inside the shared Shell, using your
//          config-driven (TanStack) columns with the DataTable renderer.
// NOTES:
//  • Keeps client posture (no SSR).
//  • Preserves your Shell layout, toolbar, and delegated Export CSV.
//  • Uses TanStack v8 properly (builds a table instance & passes to BaseDataTable).
// -----------------------------------------------------------------------------

"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Layout,
  Settings,
  ArrowUpDown,
  Filter,
  Download,
  Plus,
  Trash2,
  Copy,
  Printer,
  FileText,
  Package,
  Save,
  ChevronDown,
} from "lucide-react";

import { supabaseBrowser } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

import Shell from "./sections/shell-client";
import type { ToolbarButton } from "./sections/shell-client";

import { DataTable as BaseDataTable } from "@/components/data-table/data-table";

import {
  tallyCardsViewConfig as specificViewConfig,
  type TallyCardRow,
} from "@/app/(main)/forms/tally_cards/config";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

import {
  DEFAULT_FEATURES,
  makeDefaultToolbar,
  mergeDefaults,
  makeDefaultViewState,
} from "@/components/data-table/view-defaults";

// ---- TanStack (v8) ----
import {
  ColumnDef,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnOrderState,
  type VisibilityState,
  type RowSelectionState,
  type ColumnPinningState,
} from "@tanstack/react-table";

// -----------------------------
// Local helpers / fallbacks
// -----------------------------

function fmt(date?: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

// Minimal generic columns (only used if specific config is missing)
function buildFallbackColumns(): ColumnDef<TallyCardRow, any>[] {
  return [
    {
      accessorKey: "tally_card_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tally Card" />,
      enableSorting: true,
      cell: ({ row }) => row.original.tally_card_number,
    },
    {
      accessorKey: "warehouse",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouse" />,
      enableSorting: true,
      cell: ({ row }) => row.original.warehouse,
    },
    {
      accessorKey: "item_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Item Number" />,
      enableSorting: true,
      cell: ({ row }) => row.original.item_number,
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Active" />,
      enableSorting: true,
      cell: ({ row }) => (row.original.is_active ? "Active" : "Inactive"),
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
      enableSorting: true,
      cell: ({ row }) => fmt(row.original.updated_at ?? null),
    },
  ];
}

// Supabase → UI mapper (for fallback fetcher)
function mapDbRow(r: any): TallyCardRow {
  return {
    id: String(r.id),
    tally_card_number: String(r.tally_card_number ?? "").trim(),
    warehouse: String(r.warehouse ?? "").trim(),
    item_number: String(r.item_number ?? "").trim(),
    note: r.note ?? null,
    is_active: Boolean(r.is_active),
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  };
}

// -----------------------------
// Data fetchers
// -----------------------------

async function fetchViaApi(): Promise<TallyCardRow[] | null> {
  try {
    const res = await fetch("/api/tally_cards?page=1&pageSize=200", { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return Array.isArray(json?.rows) ? (json.rows as TallyCardRow[]) : null;
  } catch {
    return null;
  }
}

async function fetchViaSupabase(): Promise<TallyCardRow[]> {
  const sb = supabaseBrowser();
  const { data, error } = await sb
    .from("tcm_tally_cards")
    .select("id, tally_card_number, warehouse, item_number, note, is_active, created_at, updated_at")
    .order("tally_card_number", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapDbRow);
}

async function fetchTallyCards(): Promise<TallyCardRow[]> {
  const fromApi = await fetchViaApi();
  if (fromApi) return fromApi;
  return await fetchViaSupabase();
}

// -----------------------------
// Component
// -----------------------------

export default function TallyCardsViewPage() {
  const router = useRouter();
  const [rows, setRows] = useState<TallyCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // simple local filters (we keep logic; we hide quick-filter lane for Roles parity)
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Prefer specific per-view config; otherwise fall back to generic defaults
  const hasSpecific =
    !!specificViewConfig && typeof specificViewConfig.buildColumns === "function";

  // 1) Build TanStack columns from config (or fallback)
  const columns = useMemo<ColumnDef<TallyCardRow, any>[]>(() => {
    return hasSpecific ? specificViewConfig.buildColumns(true) : buildFallbackColumns();
  }, [hasSpecific]);

  // features / toolbar from config (merged with global defaults)
  const features = useMemo(() => {
    const base = mergeDefaults(DEFAULT_FEATURES, { viewStorageKey: "tally-cards-view" });
    return hasSpecific ? mergeDefaults(base, specificViewConfig.features as any) : base;
  }, [hasSpecific]);

  const toolbar = useMemo(() => {
    const baseToolbar = makeDefaultToolbar("Tally Card", "/forms/tally_cards");
    const merged = hasSpecific ? mergeDefaults(baseToolbar, specificViewConfig.toolbar as any) : baseToolbar;

    // Filter out actions we render elsewhere:
    const right = (merged.right ?? []).filter(
      (btn: any) => btn.id !== "new" && btn.id !== "export" && btn.onClickId !== "exportCsv",
    );
    return { ...merged, right };
  }, [hasSpecific]);

  // Fetch
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchTallyCards()
      .then((data) => {
        if (!mounted) return;
        setRows(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch tally cards failed", err);
        setError(err?.message ?? "Failed to load tally cards");
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Derived data by status filter + global search
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;

    if (statusFilter !== "ALL") {
      const wantActive = statusFilter === "ACTIVE";
      list = list.filter((r) => r.is_active === wantActive);
    }

    if (q) {
      list = list.filter(
        (r) =>
          r.tally_card_number.toLowerCase().includes(q) ||
          r.warehouse.toLowerCase().includes(q) ||
          r.item_number.toLowerCase().includes(q),
      );
    }

    return list;
  }, [rows, query, statusFilter]);

  // -----------------------------
  // View persistence (order/visibility)
  // -----------------------------
  const storageKey = features.viewStorageKey || "tally-cards-view";

  type PersistedView = {
    columnOrder: ColumnOrderState;
    columnVisibility: VisibilityState;
  };

  const loadPersistedView = useCallback(
    (cols: ColumnDef<TallyCardRow, any>[]): PersistedView => {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            columnOrder: parsed.columnOrder ?? [],
            columnVisibility: parsed.columnVisibility ?? {},
          };
        }
      } catch {
        // ignore
      }
      const def = makeDefaultViewState(cols as any);
      const columnOrder: ColumnOrderState = def.columnOrder ?? [];
      const columnVisibility: VisibilityState = (def.visibleColumns ?? []).reduce((acc: any, id: string) => {
        acc[id] = true;
        return acc;
      }, {} as VisibilityState);
      return { columnOrder, columnVisibility };
    },
    [storageKey],
  );

  const persistView = useCallback(
    (next: PersistedView) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [storageKey],
  );

  // Initialise view state
  const initialView = useMemo(() => loadPersistedView(columns), [loadPersistedView, columns]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(initialView.columnOrder);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialView.columnVisibility);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    right: ["actions"], // keep sticky actions if present
  });

  // Persist on change
  useEffect(() => {
    persistView({ columnOrder, columnVisibility });
  }, [columnOrder, columnVisibility, persistView]);

  // -----------------------------
  // Build TanStack table instance
  // -----------------------------
  const table = useReactTable({
    data: filtered,
    columns,
    state: {
      sorting,
      columnOrder,
      columnVisibility,
      rowSelection,
      columnPinning,
    },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onColumnPinningChange: setColumnPinning,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: !!features.rowSelection,
  });

  // Delegated handlers (toolbar + row actions)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Toolbar generic actions via data-onclick-id
      const actionBtn = target.closest<HTMLElement>("[data-onclick-id]");
      const onClickId = actionBtn?.getAttribute?.("data-onclick-id");

      if (onClickId === "exportCsv") {
        e.preventDefault();
        if (!filtered.length) {
          toast.info("No rows to export");
          return;
        }
        const headers = ["Tally Card", "Warehouse", "Item Number", "Active", "Updated"];
        const csvRows = filtered.map((r) => [
          r.tally_card_number,
          r.warehouse,
          r.item_number,
          r.is_active ? "Active" : "Inactive",
          r.updated_at ?? "",
        ]);
        const csv = [headers, ...csvRows]
          .map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
          .join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tally_cards_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      // Row actions
      const item = target.closest<HTMLElement>("[data-action-id]");
      if (!item) return;
      const actionId = item.dataset.actionId as string | undefined;
      const rowId = item.dataset.rowId as string | undefined;
      if (!actionId || !rowId) return;

      const row = rows.find((r) => r.id === rowId);
      if (!row) return;

      if (actionId === "view") {
        router.push(`/forms/tally_cards/${rowId}`);
        return;
      }
      if (actionId === "edit") {
        router.push(`/forms/tally_cards/${rowId}/edit`);
        return;
      }
      if (actionId === "delete") {
        const ok = window.confirm(`Delete tally card ${row.tally_card_number}?`);
        if (!ok) return;
        try {
          const sb = supabaseBrowser();
          const { error } = await sb.from("tcm_tally_cards").delete().eq("id", rowId);
          if (error) throw error;
          setRows((prev) => prev.filter((r) => r.id !== rowId));
          toast.success("Tally card deleted");
        } catch (err: any) {
          toast.error(err?.message ?? "Delete failed");
        }
        return;
      }
    };

    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [rows, router, filtered]);

  // ---------- Roles-like chrome (outside table) ----------
  const primaryButtons = [
    { id: "new", label: "New", icon: Plus, className: "bg-primary text-primary-foreground hover:bg-primary/90" },
    { id: "delete", label: "Delete", icon: Trash2, variant: "destructive", disabled: true },
    { id: "duplicate", label: "Duplicate", icon: Copy, variant: "outline", disabled: true },
  ] satisfies ToolbarButton[];

  const leftButtons = [
    {
      id: "printReport",
      label: "Print Report",
      icon: Printer,
      variant: "outline",
      disabled: true,
      menu: { items: [{ id: "printReport.default", label: "Print Report", icon: Printer }] },
    },
    {
      id: "printInvoice",
      label: "Print Invoice",
      icon: FileText,
      variant: "outline",
      disabled: true,
      menu: { items: [{ id: "printInvoice.default", label: "Print Invoice", icon: FileText }] },
    },
    {
      id: "printPackingSlip",
      label: "Print Packing Slip",
      icon: Package,
      variant: "outline",
      disabled: true,
      menu: { items: [{ id: "printPackingSlip.default", label: "Print Packing Slip", icon: Package }] },
    },
  ] satisfies ToolbarButton[];

  const rightRow2Buttons = [
    {
      id: "saveView",
      label: "Save View",
      icon: Save,
      variant: "outline",
      className:
        "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30",
    },
  ] satisfies ToolbarButton[];

  const toolbarLeft = (
    <>
      <Button variant="outline" className="flex items-center gap-2" data-toolbar-id="views">
        <Layout className="h-4 w-4" />
        Views
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Button variant="outline" className="flex items-center gap-2" data-toolbar-id="columns">
        <Settings className="h-4 w-4" />
        Columns
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Button variant="outline" className="flex items-center gap-2" data-toolbar-id="sort">
        <ArrowUpDown className="h-4 w-4" />
        Sort
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Button variant="outline" className="flex items-center gap-2" data-toolbar-id="moreFilters">
        <Filter className="h-4 w-4" />
        More Filters
        <ChevronDown className="h-4 w-4" />
      </Button>
    </>
  );

  const toolbarRight = (
    <>
      {toolbar.right?.map((btn: any) =>
        btn.href ? (
          <Button key={btn.id} variant={btn.variant ?? "default"} asChild>
            <a href={btn.href}>
              {btn.icon ? <btn.icon className="mr-2 h-4 w-4" /> : null}
              {btn.label}
            </a>
          </Button>
        ) : (
          <Button key={btn.id} variant={btn.variant ?? "default"} data-onclick-id={btn.onClickId || btn.id}>
            {btn.icon ? <btn.icon className="mr-2 h-4 w-4" /> : null}
            {btn.label}
          </Button>
        ),
      )}
      <Button
        variant="outline"
        data-onclick-id="exportCsv"
        className="ml-auto bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
      >
        <Download className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
    </>
  );

  const footerSlot = null;

  return (
    <div ref={containerRef}>
      <Shell
        title="View Tally Cards"
        count={rows.length}
        primaryButtons={primaryButtons}
        leftButtons={leftButtons}
        rightButtons={rightRow2Buttons}
        showFilterChip={true}
        showSortingChip={false}
        toolbarLeft={toolbarLeft}
        toolbarRight={toolbarRight}
        quickFiltersSlot={undefined}
        footerSlot={footerSlot}
      >
        <div>
          {loading ? (
            <div className="flex items-center justify-center p-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading tally cards…
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-red-600">{error}</div>
          ) : (
            // ✅ Pass the TanStack table instance to your renderer
            <BaseDataTable table={table} className="rounded-lg" />
          )}
        </div>
      </Shell>
    </div>
  );
}
