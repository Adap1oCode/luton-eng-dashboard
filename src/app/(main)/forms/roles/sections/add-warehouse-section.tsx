"use client";

import { useState } from "react";

import { ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
        <CardContent className="grid grid-cols-12 gap-6">
          {" "}
          {/* زيادة الـ gap للوضوح */}
          {/* Left column: inputs */}
          <div className="col-span-12 space-y-4 lg:col-span-6">
            {" "}
            {/* زيادة الـ space-y */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Warehouse</label>{" "}
              {/* تحسين الليبل */}
              <Select value={form.selectedWarehouse ?? ""} onValueChange={(v) => form.setSelectedWarehouse(v)}>
                <SelectTrigger className="rounded-lg border-2 border-gray-300 bg-white focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-700">
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
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Note (optional)</label>
              <Textarea
                className="rounded-lg border-2 border-gray-300 bg-white focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                value={form.addNote}
                onChange={(e) => form.setAddNote(e.target.value)}
                placeholder="Optional note for this assignment"
                rows={4}
              />
            </div>
            <div className="pt-3">
              {" "}
              {/* زيادة الـ pt */}
              <Button
                onClick={form.addWarehouse}
                disabled={!form.roleId || !form.selectedWarehouse}
                className="px-6 py-2 text-base" // جعل الزر أكبر وأوضح
              >
                Add Warehouse
              </Button>
            </div>
          </div>
          {/* Right column: read-only info about selected warehouse */}
          <div className="col-span-12 space-y-4 lg:col-span-6">
            <div className="rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-gray-700">
              {" "}
              {/* تحسين الـ border و padding */}
              <div className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">Selected Warehouse</div>{" "}
              {/* تحسين الليبل */}
              <div className="text-sm text-gray-900 dark:text-gray-100">
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
