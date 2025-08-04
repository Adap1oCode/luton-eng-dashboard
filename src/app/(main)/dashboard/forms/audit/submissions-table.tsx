// src/app/(main)/dashboard/forms/audit/submissions-table.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { RadioGroupItem, RadioGroup } from "@/components/ui/radio-group";

import { tableName, auditTableColumns, auditFormConfig } from "./config";

// The shape of a row in your `audit` table
export type AuditRow = Record<string, any>;

export default function SubmissionsTable({
  onSelect,
}: {
  onSelect?: (row: AuditRow) => void;
}) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  // Build a comma-separated list of fields to SELECT
  const columnNames = auditTableColumns.map((c) => c.name).join(",");

  useEffect(() => {
    supabase
      .from<typeof tableName, AuditRow>(tableName)
      .select()               // ← “select()” returns *all* columns
      .order("submission_date", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("Fetch error:", error);
        else setRows(data ?? []);
      });
  }, []);


  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow">
      {/* Header */}
      <div className="flex flex-col space-y-1.5 p-6">
        <div className="font-semibold tracking-tight text-2xl">
          Existing Submissions
        </div>
        <div className="text-sm text-muted-foreground">
          Click a row to edit
        </div>
      </div>

      {/* Table wrapper */}
      <div className="p-6 pt-0 flex flex-col gap-4">
        <div className="rounded-md border">
          <div className="relative w-full overflow-y-auto overflow-x-hidden">
            <Table className="w-full caption-bottom text-sm">
              <TableHeader>
                <TableRow className="[&_tr]:border-b">
                  <TableHead className="w-10" data-name="select" />
                  {auditTableColumns.map((col) => (
                    <TableHead key={col.name}>
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="w-10" data-name="actions" />
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr:last-child]:border-0">
                {rows.map((row) => {
                  const id = row.id;
                  return (
                    <TableRow
                      key={id}
                      data-state={id === selectedId}
                      className={`border-b transition-colors hover:bg-muted/50 ${
                        id === selectedId ? "bg-muted" : ""
                      }`}
                      onClick={() => {
                        setSelectedId(id);
                        onSelect?.(row);
                      }}
                    >
                      {/* selector */}
                      <TableCell data-name="select" className="p-4">
                        <RadioGroup value={String(id)}>
                          <RadioGroupItem value={String(id)} />
                        </RadioGroup>
                      </TableCell>

                      {/* data cells */}
                      {auditTableColumns.map((col) => (
                        <TableCell
                          key={col.name}
                          data-name={col.name}
                          className="p-4 align-middle"
                        >
                          {col.name === "submission_date"
                            ? new Date(row[col.name]).toLocaleDateString()
                            : String(row[col.name] ?? "")}
                        </TableCell>
                      ))}

                      {/* actions placeholder */}
                      <TableCell data-name="actions" className="p-4">
                        {/* You can replace this with your “•••” menu trigger */}
                        <button
                          className="inline-flex items-center justify-center gap-2 rounded-md text-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground h-8 p-0"
                          aria-label="Actions"
                        >
                          …{/* replace with your lucide icon */}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* pagination / footer */}
        <div className="flex items-center justify-end gap-2">
          <div className="text-muted-foreground flex-1 text-sm">
            {rows.filter((r) => r.id === selectedId).length} of {rows.length} row(s) selected.
          </div>
          <div className="flex gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background text-xs font-medium py-1 px-3 disabled:opacity-50"
              disabled
            >
              Previous
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background text-xs font-medium py-1 px-3 disabled:opacity-50"
              disabled
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
