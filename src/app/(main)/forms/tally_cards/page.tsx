"use client";

// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally_cards/page.tsx
// TYPE: Client Component
// PURPOSE: Fixed tally cards page with proper type definitions and error handling
// -----------------------------------------------------------------------------

import * as React from "react";

import { useRouter, useSearchParams } from "next/navigation";

import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  ColumnDef,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  getExpandedRowModel,
  SortingState,
  ExpandedState,
  RowSelectionState,
  PaginationState,
} from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import DataTableToolbar from "@/components/data-table/data-table-toolbar";
import PageShell from "@/components/forms/shell/page-shell";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { TallyCardRow } from "@/lib/data/resources/tally_cards/types";

import { tallyCardsToolbar, tallyCardsChips } from "./toolbar.config";

type PageProps = {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
};

function fmt(date?: string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildColumns(): ColumnDef<TallyCardRow, any>[] {
  const cols: ColumnDef<TallyCardRow, any>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "role_name",
      accessorKey: "tally_card_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role Name" />,
      enableSorting: true,
      cell: ({ row }) => <div className="font-medium">{row.original.tally_card_number}</div>,
    },
    {
      id: "code",
      accessorKey: "item_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      enableSorting: true,
      cell: ({ row }) => row.original.item_number || "—",
    },
    {
      id: "status",
      accessorKey: "is_active",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      enableSorting: true,
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge className="bg-red-500 px-2 py-0.5 text-xs text-white">Active</Badge>
        ) : (
          <Badge className="bg-gray-500 px-2 py-0.5 text-xs text-white">Inactive</Badge>
        ),
    },
    {
      id: "warehouses_assigned",
      accessorKey: "warehouse",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Warehouses Assigned" />,
      enableSorting: true,
      cell: ({ row }) => row.original.warehouse || "No warehouse",
    },
  ];
  return cols;
}

export default function Page({ searchParams }: PageProps) {
  const router = useRouter();
  const currentSearchParams = useSearchParams();

  // Unwrap the Promise from searchParams
  const [resolvedParams, setResolvedParams] = React.useState<{
    page?: string;
    pageSize?: string;
  }>({});

  React.useEffect(() => {
    searchParams.then((params) => {
      setResolvedParams(params);
    });
  }, [searchParams]);

  const page = Math.max(1, Number(resolvedParams?.page ?? 1));
  const pageSize = Math.min(500, Math.max(1, Number(resolvedParams?.pageSize ?? 10)));

  const [rows, setRows] = React.useState<TallyCardRow[]>([
    {
      id: "1",
      tally_card_number: "Auditor RTZ Warehouse",
      item_number: "AUDITOR_RTZ",
      warehouse: "RTZ",
      note: "",
      is_active: true,
      created_at: "2023-01-01",
    },
    {
      id: "2",
      tally_card_number: "Inventory Manager - Warehouse",
      item_number: "INV_MANAGER_RTZ",
      warehouse: "",
      note: "",
      is_active: true,
      created_at: "2023-01-02",
    },
    {
      id: "3",
      tally_card_number: "Store Officer at RTZ",
      item_number: "STORE_OFFICER_RTZ",
      warehouse: "RTZ",
      note: "",
      is_active: true,
      created_at: "2023-01-03",
    },
    {
      id: "4",
      tally_card_number: "Tally Card Manager RTZ",
      item_number: "TC_MANAGER_RTZ",
      warehouse: "RTZ",
      note: "",
      is_active: true,
      created_at: "2023-01-04",
    },
  ]);
  const [total, setTotal] = React.useState(4);
  const [loading, setLoading] = React.useState(false);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/tally_cards?page=${page}&pageSize=${pageSize}`, {
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        const payload = json ?? {};
        const parsedRows = (payload.rows ?? payload.data ?? []) as TallyCardRow[];
        const parsedTotal = Number(payload.total ?? payload.count ?? parsedRows.length);
        setRows(parsedRows);
        setTotal(parsedTotal);
      })
      .catch((error) => {
        console.error("Fetch error:", error);
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, pageSize]);

  const columns = React.useMemo(() => buildColumns(), []);

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      sorting,
      rowSelection,
      pagination: { pageIndex: page - 1, pageSize },
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => rows?.map((row) => row.tally_card_number ?? "") ?? [],
    [rows],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Implement your drag-and-drop reordering logic here
    console.log("Drag ended:", { from: active.id, to: over.id });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(currentSearchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  if (loading) {
    return (
      <PageShell title="View Roles" count={0} toolbarConfig={tallyCardsToolbar} chipConfig={tallyCardsChips}>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="View Tally Cards"
      count={total}
      toolbarSlot={
        <DataTableToolbar
          toggles={{
            showNew: true,
            showDelete: true,
            showDuplicate: true,
            showPrintReport: true,
            showPrintInvoice: true,
            showPrintPackingSlip: true,
            showFilterSortingChip: true,
            showSortingChip: true,
            showViews: true,
            showColumns: true,
            showSort: true,
            showMoreFilters: true,
            showSaveView: true,
            showExportCsv: true,
          }}
          disabled={{
            delete: table.getSelectedRowModel().rows.length === 0,
            duplicate: table.getSelectedRowModel().rows.length !== 1,
          }}
        />
      }
    >
      <DataTable
        dndEnabled={false}
        table={table}
        dataIds={dataIds}
        handleDragEnd={handleDragEnd}
        sensors={sensors}
        sortableId="tally-cards"
      />
      <DataTablePagination table={table} />
    </PageShell>
  );
}
