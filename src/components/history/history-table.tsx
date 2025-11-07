"use client";

// src/components/history/history-table.tsx
// Lightweight read-only history table component
// Reuses ResourceTableClient in lite mode with most features disabled

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import { OptimisticProvider } from "@/components/forms/shell/optimistic-context";

interface HistoryTableProps {
  resourceKey: string;
  recordId: string;
  columnsConfig: Array<{ key: string; label: string; width?: number; format?: "date" | "text" | "number" | "boolean" }>;
  queryKey: (string | number)[];
}

// Format date value for display
// If value is already a formatted string (like updated_at_pretty), display it as-is
// Otherwise, parse and format it
function formatDateValue(value: unknown): string {
  if (!value) return "-";
  
  // If it's already a formatted string (contains time like "HH:MM"), return as-is
  if (typeof value === "string" && /:\d{2}\s*$/.test(value)) {
    return value;
  }
  
  try {
    const date = new Date(value as string);
    if (isNaN(date.getTime())) {
      return String(value);
    }
    return format(date, "MMM dd, yyyy");
  } catch {
    return String(value ?? "-");
  }
}

// Format number value for display
function formatNumberValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  return String(value);
}

// Format boolean value for display
function formatBooleanValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  // Handle string representations of booleans
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "true" || lower === "yes" || lower === "1") return "Yes";
    if (lower === "false" || lower === "no" || lower === "0") return "No";
  }
  return String(value);
}

export default function HistoryTable({ resourceKey, recordId, columnsConfig, queryKey }: HistoryTableProps) {
  // Fetch history data
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/resources/${resourceKey}/${recordId}/history`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to fetch history");
      }
      return res.json() as Promise<{ rows: any[]; total: number }>;
    },
    staleTime: 60000,
    gcTime: 300000, // React Query v5 renamed cacheTime to gcTime
  });

  // Map columnsConfig to TanStack columns
  // Handle dot-notation accessors (e.g., "user.full_name") for nested enrichment data
  const columns: ColumnDef<any>[] = React.useMemo(
    () =>
      columnsConfig.map((col) => {
        const accessorFn = col.key.includes(".")
          ? (row: any) => {
              const [parent, child] = col.key.split(".");
              return row[parent]?.[child] ?? row[col.key] ?? null;
            }
          : undefined;
        return {
          accessorKey: accessorFn ? undefined : col.key,
          accessorFn,
          header: col.label,
          size: col.width,
          cell: ({ getValue }) => {
            const value = getValue();
            if (col.format === "date") {
              return <span className="text-sm">{formatDateValue(value)}</span>;
            }
            if (col.format === "number") {
              return <span className="text-sm">{formatNumberValue(value)}</span>;
            }
            if (col.format === "boolean") {
              return <span className="text-sm">{formatBooleanValue(value)}</span>;
            }
            return <span className="text-sm">{String(value ?? "-")}</span>;
          },
        };
      }),
    [columnsConfig]
  );

  // Create minimal config for lite mode
  const liteConfig: BaseViewConfig<any> = React.useMemo(
    () => ({
      features: {
        sortable: false,
        globalSearch: false,
        exportCsv: false,
        pagination: false,
        rowSelection: false,
        dnd: false,
        saveView: false,
      },
      toolbar: {
        left: undefined,
        right: [],
      },
      quickFilters: [],
      buildColumns: () => columns,
      bottomToolbarButtons: {
        views: false,
        columns: false,
        sort: false,
        moreFilters: false,
        saveView: false,
      },
    }),
    [columns]
  );

  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
        <div className="p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
        <div className="p-6 text-center text-red-600 dark:text-red-400">
          Failed to load history: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  // Render empty state
  if (!data || data.rows.length === 0) {
    return (
      <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
        <div className="p-6 py-8 text-center text-gray-500 dark:text-gray-400">No history available</div>
      </div>
    );
  }

  // Render table in lite mode
  // Wrap with OptimisticProvider since ResourceTableClient requires it
  // Match PageShell container structure for consistent borders and styling
  return (
    <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
      <OptimisticProvider>
        <div className="w-full px-4 sm:px-6">
          <ResourceTableClient
            config={liteConfig}
            initialRows={data.rows}
            initialTotal={data.total}
            page={1}
            pageSize={data.total} // Show all on one page (no pagination)
            enableColumnResizing={false}
            enableColumnReordering={false}
            showInlineExportButton={false}
          />
        </div>
      </OptimisticProvider>
      {/* Optional footer: "Showing {rows.length} of {total} versions" */}
      {data.total > data.rows.length && (
        <div className="flex flex-col items-start justify-between gap-4 border-t border-gray-200 px-4 py-3 sm:flex-row sm:items-center dark:border-gray-700">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            Showing {data.rows.length} of {data.total} versions
          </div>
        </div>
      )}
    </div>
  );
}

