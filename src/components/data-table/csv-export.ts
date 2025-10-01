// src/components/data-table/csv-export.ts

export type ColumnDefLite<T> = {
  id: string;
  /** Header label in CSV; falls back to id */
  label?: string;
  /** Custom accessor/formatter for CSV cell */
  accessor?: (row: T) => unknown;
};

type PlainRowsInput<T> = {
  rows: T[];
  columns: ColumnDefLite<T>[];
};

type TanstackLikeTable = {
  getRowModel: () => { rows: Array<{ original: any; getVisibleCells?: () => any[] }> };
  getVisibleLeafColumns?: () => Array<{ id: string; columnDef?: { header?: string } }>;
};

/**
 * Export to CSV
 * - Works with either:
 *   A) a TanStack-like table instance, or
 *   B) plain rows + column defs.
 */
export function exportCSV<T>(
  input: PlainRowsInput<T> | TanstackLikeTable,
  filenameBase: string = "export"
) {
  const isTanstack = typeof (input as TanstackLikeTable).getRowModel === "function";

  let headers: string[] = [];
  let dataRows: string[][] = [];

  if (isTanstack) {
    const table = input as TanstackLikeTable;

    const visibleCols =
      table.getVisibleLeafColumns?.() ??
      table.getRowModel().rows[0]?.getVisibleCells?.().map((c: any) => c.column) ??
      [];

    headers = visibleCols.map((c: any) => {
      const label =
        (c?.columnDef?.header && String(c.columnDef.header)) ||
        (c?.id && String(c.id)) ||
        "";
      return wrapCSV(label);
    });

    const rows = table.getRowModel().rows;
    dataRows = rows.map((r) => {
      const obj = r.original ?? {};
      return visibleCols.map((c: any) => {
        const key = c.id;
        const value = safeGet(obj, key);
        return wrapCSV(value);
      });
    });
  } else {
    const { rows, columns } = input as PlainRowsInput<T>;
    headers = columns.map((c) => wrapCSV(c.label ?? c.id));
    dataRows = rows.map((row) =>
      columns.map((c) => wrapCSV(c.accessor ? c.accessor(row) : (row as any)[c.id]))
    );
  }

  const content = [headers.join(","), ...dataRows.map((r) => r.join(","))].join("\n");
  downloadCSV(content, `${filenameBase}_${timestamp()}.csv`);
}

function wrapCSV(value: unknown): string {
  const s =
    value == null
      ? ""
      : typeof value === "string"
      ? value
      : typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : JSON.stringify(value);
  // Escape quotes and wrap in quotes
  return `"${s.replace(/"/g, '""')}"`;
}

function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}-${pad(d.getMinutes())}`;
}

function downloadCSV(content: string, filename: string) {
  // Add BOM for Excel compatibility
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeGet(obj: any, key: string) {
  return obj?.[key];
}
