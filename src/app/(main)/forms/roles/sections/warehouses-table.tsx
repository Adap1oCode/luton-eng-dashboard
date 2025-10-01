"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

type Assigned = {
  warehouse: string;     // role_warehouse_rules.warehouse
  note: string | null;
  added_at: string;
  added_by: string | null; // optional
};

type Props = {
  form: {
    assigned: Assigned[];
    assignedQuery: string;
    setAssignedQuery: (v: string) => void;

    selectedAssigned: Set<string>; // set of warehouse codes
    toggleAssigned: (warehouse: string) => void;
    clearSelection: () => void;

    removeSelected: () => Promise<void>;
    isMutating: boolean;
  };
};

export function WarehousesTable({ form }: Props) {
  const filtered = useMemo(() => {
    const q = (form.assignedQuery ?? "").trim().toUpperCase();
    if (!q) return form.assigned;
    return form.assigned.filter((r) =>
      r.warehouse.toUpperCase().includes(q) || (r.note ?? "").toUpperCase().includes(q)
    );
  }, [form.assigned, form.assignedQuery]);

  return (
    <Card className="@container/card">
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Assigned Warehouses</CardTitle>
          <CardDescription>Warehouses where this role applies.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Filter…"
            value={form.assignedQuery}
            onChange={(e) => form.setAssignedQuery(e.target.value)}
            className="w-[220px]"
          />
          <Button
            variant="destructive"
            onClick={form.removeSelected}
            disabled={!form.selectedAssigned.size || form.isMutating}
          >
            Remove
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="w-10"></th>
                <th>Warehouse</th>
                <th>Note</th>
                <th>Added At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const checked = form.selectedAssigned.has(row.warehouse);
                return (
                  <tr key={row.warehouse} className="border-t">
                    <td className="py-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => form.toggleAssigned(row.warehouse)}
                        aria-label={`Select ${row.warehouse}`}
                      />
                    </td>
                    <td className="py-2">{row.warehouse}</td>
                    <td className="py-2">{row.note ?? "—"}</td>
                    <td className="py-2">{row.added_at}</td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-muted-foreground">
                    No assignments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {filtered.map((row) => {
            const checked = form.selectedAssigned.has(row.warehouse);
            return (
              <div key={row.warehouse} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{row.warehouse}</div>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => form.toggleAssigned(row.warehouse)}
                    aria-label={`Select ${row.warehouse}`}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Added At: {row.added_at}
                </div>
                <div className="text-sm">{row.note ?? "—"}</div>
              </div>
            );
          })}
          {!filtered.length && (
            <div className="text-center text-sm text-muted-foreground py-6">No assignments found.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
