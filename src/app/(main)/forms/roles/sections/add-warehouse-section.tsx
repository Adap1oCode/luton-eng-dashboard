"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Props = {
  form: {
    roleId: string | null;

    // source lists
    allWarehouses: { code: string; name: string }[];
    selectedWarehouse: string | null;
    setSelectedWarehouse: (code: string | null) => void;

    addNote: string;
    setAddNote: (v: string) => void;

    // actions
    addWarehouse: () => Promise<void>;

    // right panel info
    selectedWarehouseInfo: { code: string; name: string } | null;
  };
};

export function AddWarehouseSection({ form }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="@container/card">
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Add Warehouse</CardTitle>
          <CardDescription>Assign a warehouse to this role.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Toggle">
          {open ? <ChevronDown /> : <ChevronRight />}
        </Button>
      </CardHeader>

      {open && (
        <CardContent className="grid grid-cols-12 gap-4">
          {/* Left column: inputs */}
          <div className="col-span-12 lg:col-span-6 space-y-3">
            <div>
              <label className="text-sm font-medium">Warehouse</label>
              <Select value={form.selectedWarehouse ?? ""} onValueChange={(v) => form.setSelectedWarehouse(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse..." />
                </SelectTrigger>
                <SelectContent>
                  {form.allWarehouses.map((w) => (
                    <SelectItem key={w.code} value={w.code}>
                      {w.code} — {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Note (optional)</label>
              <Textarea
                value={form.addNote}
                onChange={(e) => form.setAddNote(e.target.value)}
                placeholder="Optional note for this assignment"
                rows={3}
              />
            </div>

            <div className="pt-2">
              <Button onClick={form.addWarehouse} disabled={!form.roleId || !form.selectedWarehouse}>
                Add Warehouse
              </Button>
            </div>
          </div>

          {/* Right column: read-only info about selected warehouse */}
          <div className="col-span-12 lg:col-span-6 space-y-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Selected Warehouse</div>
              <div className="text-sm">
                {form.selectedWarehouseInfo
                  ? `${form.selectedWarehouseInfo.code} — ${form.selectedWarehouseInfo.name}`
                  : "None selected"}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
