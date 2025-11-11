"use client";

// -----------------------------------------------------------------------------
// FILE: src/components/dialogs/inventory-info-dialog.tsx
// TYPE: Client component
// PURPOSE: Shared inventory info dialog leveraging Radix/Shadcn dialog shell
// -----------------------------------------------------------------------------

import * as React from "react";
import { Loader2 } from "lucide-react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import {
  inventoryInfoSections,
  type InventoryInfoFieldConfig,
  type InventoryInfoSectionConfig,
  type InventoryInfoSnapshot,
} from "./configs/inventory-info.config";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type InventoryInfoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemNumber: string | number | null;
};

const INVENTORY_ENDPOINT = "/api/inventory-current";

const numberFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const gridColumnsClass: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

export function InventoryInfoDialog({ open, onOpenChange, itemNumber }: InventoryInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl rounded-xl border bg-card text-card-foreground shadow-lg p-0">
        <div className="flex flex-col gap-6 p-6 sm:p-8">
          <DialogHeader className="flex flex-col gap-1.5 text-left">
            <DialogTitle className="text-2xl font-semibold tracking-tight">Inventory Information</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Detailed snapshot sourced from the `inventory-current` view.
            </DialogDescription>
          </DialogHeader>
          <InventoryInfoDialogErrorBoundary key={itemNumber ?? "empty"}>
            <InventoryInfoDialogContent itemNumber={itemNumber} open={open} />
          </InventoryInfoDialogErrorBoundary>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InventoryInfoDialogContent({
  itemNumber,
  open,
}: {
  itemNumber: string | number | null;
  open: boolean;
}) {
  const [snapshot, setSnapshot] = React.useState<InventoryInfoSnapshot | null>(null);
  const [warehouseRows, setWarehouseRows] = React.useState<InventoryInfoWarehouseRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const cacheRef = React.useRef<
    Map<string, { snapshot: InventoryInfoSnapshot; rows: InventoryInfoWarehouseRow[] }>
  >(new Map());

  React.useEffect(() => {
    if (!open || !itemNumber) {
      setSnapshot(null);
      setWarehouseRows([]);
      setError(null);
      setLoading(false);
      return;
    }

    const cacheKey = String(itemNumber);
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setSnapshot(cached.snapshot);
      setWarehouseRows(cached.rows);
    }

    let active = true;
    const controller = new AbortController();

    const fetchInventoryData = async () => {
      setLoading(true);
      setError(null);

      try {
        const qs = new URLSearchParams({
          "filters[item_number][value]": String(itemNumber),
          "filters[item_number][mode]": "equals",
          pageSize: "500",
          raw: "true",
        });

        const response = await fetch(`${INVENTORY_ENDPOINT}?${qs.toString()}`, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(response.statusText || "Failed to fetch inventory data");
        }

        const payload = await response.json();
        const rawRows: any[] = payload?.rows ?? payload?.data ?? [];

        if (!rawRows.length) {
          if (active) {
            setSnapshot(null);
            setError("No inventory data found for this item number.");
            setWarehouseRows([]);
          }
          return;
        }

        const normalizedRows = rawRows.map<InventoryInfoWarehouseRow>((row) => ({
          warehouse: coerceNullableString(row.warehouse),
          location: coerceNullableString(row.location),
          total_in_house: coerceNumber(row.total_in_house),
          total_checked_out: coerceNumber(row.total_checked_out),
          total_available: coerceNumber(row.total_available),
          committed: coerceNumber(row.committed),
          on_order: coerceNumber(row.on_order),
        }));

        const primary = rawRows[0];

        const aggregated: InventoryInfoSnapshot = {
          item_number: coerceNumber(primary.item_number),
          description: coerceNullableString(primary.description),
          category: coerceNullableString(primary.category),
          unit_of_measure: coerceNullableString(primary.unit_of_measure),
          total_available: sumField(normalizedRows, "total_available"),
          item_cost: coerceNumber(primary.item_cost),
          on_order: sumField(normalizedRows, "on_order"),
          committed: sumField(normalizedRows, "committed"),
        };

        if (active) {
          cacheRef.current.set(cacheKey, { snapshot: aggregated, rows: normalizedRows });
          setSnapshot(aggregated);
          setWarehouseRows(normalizedRows);
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        const message = err instanceof Error ? err.message : "Failed to load inventory information.";
        if (active) {
          setError(message);
        }
        console.error("[InventoryInfoDialog] Error fetching inventory:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchInventoryData();

    return () => {
      active = false;
      controller.abort();
    };
  }, [itemNumber, open]);

  if (!itemNumber) {
    return (
      <Alert>
        <AlertTitle>No item selected</AlertTitle>
        <AlertDescription>
          Choose an item number to view its current inventory details.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading && !snapshot) {
    return <InventoryInfoDialogSkeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load inventory information</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!snapshot) {
    return null;
  }

  const refreshing = loading && Boolean(snapshot);

  return (
    <div className="flex flex-col gap-6">
      {refreshing && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Refreshing inventory snapshot…
        </div>
      )}
      <FieldSections snapshot={snapshot} />
      <WarehouseBreakdownTable rows={warehouseRows} loading={loading} />
    </div>
  );
}

const secondaryFieldConfigs: InventoryInfoFieldConfig[] = [
  { key: "description", label: "Description", type: "text" },
  { key: "category", label: "Category", type: "text" },
  { key: "unit_of_measure", label: "Unit of Measure", type: "text" },
  { key: "total_available", label: "Total Available", type: "metric" },
  { key: "item_cost", label: "Item Cost", type: "currency" },
  { key: "on_order", label: "On Order", type: "metric" },
  { key: "committed", label: "Committed", type: "metric" },
];

function FieldSections({ snapshot }: { snapshot: InventoryInfoSnapshot }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4">
        <StandardField
          label="Item Number"
          value={renderFieldValue(
            { key: "item_number", label: "Item Number", type: "code" },
            snapshot
          )}
          variant="prominent"
        />
      </div>

      <div className="grid gap-4 @md:grid-cols-2 @xl:grid-cols-3">
        {secondaryFieldConfigs.map((field) => (
          <StandardField
            key={field.key}
            label={field.label}
            value={renderFieldValue(field, snapshot)}
          />
        ))}
      </div>
    </div>
  );
}

function StandardField({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: React.ReactNode;
  variant?: "default" | "prominent";
}) {
  if (variant === "prominent") {
    return (
      <div className="rounded-xl border border-input bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <span className="text-sm font-medium leading-none text-muted-foreground">
            {label}
          </span>
          <span className="text-3xl font-semibold tracking-tight">{value}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium leading-none text-muted-foreground">
        {label}
      </label>
      <div className="flex min-h-9 items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm">
        {value}
      </div>
    </div>
  );
}

function renderFieldValue(
  field: InventoryInfoFieldConfig,
  snapshot: InventoryInfoSnapshot | null
): React.ReactNode {
  const rawValue = snapshot ? snapshot[field.key] : null;

  if (field.format) {
    return field.format(rawValue, snapshot);
  }

  switch (field.type) {
    case "metric":
      return formatNumber(rawValue);
    case "currency":
      return formatCurrency(rawValue);
    case "code":
      return rawValue != null ? String(rawValue) : "—";
    default:
      return rawValue != null && rawValue !== "" ? String(rawValue) : "—";
  }
}

function formatNumber(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return numberFormatter.format(numeric);
}

function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return currencyFormatter.format(numeric);
}

function coerceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function coerceNullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return String(value);
}

function InventoryInfoDialogSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4">
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
      <div className="grid gap-4 @md:grid-cols-2 @xl:grid-cols-3">
        {Array.from({ length: 7 }).map((_, idx) => (
          <Skeleton key={idx} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}

class InventoryInfoDialogErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message?: string }
> {
  state = { hasError: false, message: undefined as string | undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[InventoryInfoDialog] rendering error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            {this.state.message ?? "An unexpected error occurred while rendering the inventory dialog."}
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

type InventoryInfoWarehouseRow = {
  warehouse: string | null;
  location: string | null;
  total_in_house: number | null;
  total_checked_out: number | null;
  total_available: number | null;
  committed: number | null;
  on_order: number | null;
};

const NUMERIC_COLUMN_IDS = new Set([
  "total_in_house",
  "total_checked_out",
  "total_available",
]);

function sumField(
  rows: InventoryInfoWarehouseRow[],
  key: keyof Pick<InventoryInfoWarehouseRow, "total_in_house" | "total_checked_out" | "total_available" | "committed" | "on_order">
): number | null {
  const values = rows
    .map((row) => row[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!values.length) return null;
  return values.reduce((acc, value) => acc + value, 0);
}

function WarehouseBreakdownTable({
  rows,
  loading,
}: {
  rows: InventoryInfoWarehouseRow[];
  loading: boolean;
}) {
  const columns = React.useMemo<ColumnDef<InventoryInfoWarehouseRow>[]>(() => [
    {
      accessorKey: "warehouse",
      header: "Warehouse",
      cell: ({ getValue }) => getValue<string | null>() ?? "—",
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ getValue }) => getValue<string | null>() ?? "—",
    },
    {
      accessorKey: "total_in_house",
      header: "Total In House",
      cell: ({ row }) => formatNumber(row.original.total_in_house),
    },
    {
      accessorKey: "total_checked_out",
      header: "Total Checked Out",
      cell: ({ row }) => formatNumber(row.original.total_checked_out),
    },
    {
      accessorKey: "total_available",
      header: "Total Available",
      cell: ({ row }) => formatNumber(row.original.total_available),
    },
  ], []);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!rows.length && !loading) {
    return (
      <Alert>
        <AlertTitle>No warehouse data</AlertTitle>
        <AlertDescription>
          This item does not have any warehouse allocations recorded in the inventory snapshot.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-base font-semibold text-foreground">Inventory by warehouse</div>
      <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-full text-sm">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-muted/50">
                  {headerGroup.headers.map((header) => {
                    const isNumeric = NUMERIC_COLUMN_IDS.has(header.column.id);
                    return (
                      <TableHead
                        key={header.id}
                        className={`px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground ${isNumeric ? "text-right" : "text-left"}`}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="border-t border-border/60">
                    {row.getVisibleCells().map((cell) => {
                      const isNumeric = NUMERIC_COLUMN_IDS.has(cell.column.id);
                      return (
                        <TableCell
                          key={cell.id}
                          className={`px-3 py-3 text-sm text-foreground ${isNumeric ? "text-right font-medium tabular-nums" : "text-left font-medium"}`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={table.getAllLeafColumns().length} className="p-4 text-center text-sm text-muted-foreground">
                    {loading ? "Loading warehouse breakdown…" : "No warehouse data available."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
