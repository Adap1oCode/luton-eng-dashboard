"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

type Props = {
  form: {
    // role fields
    roleId: string | null;
    name: string;
    description: string;
    isActive: boolean;
    createdAt: string | null;
    updatedAt: string | null;

    // setters
    setName: (v: string) => void;
    setDescription: (v: string) => void;
    setIsActive: (v: boolean) => void;

    // computed
    assignedCount: number;
    // statusLabel removed from props to avoid type mismatch
  };
};

export function RoleDetailsSection({ form }: Props) {
  const [open, setOpen] = useState(true);
  // Compute label locally to keep prop types simple and avoid union mismatch
  const statusLabel: "Active" | "Inactive" = form.isActive ? "Active" : "Inactive";

  return (
    <Card className="@container/card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Role Details</CardTitle>
          <CardDescription>Define the role and its basic properties.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(v => !v)} aria-label="Toggle">
          {open ? <ChevronDown /> : <ChevronRight />}
        </Button>
      </CardHeader>

      {open && (
        <CardContent className="grid grid-cols-12 gap-4">
          {/* Left column */}
          <div className="col-span-12 lg:col-span-4 space-y-3">
            <div>
              <label className="text-sm font-medium">Role Name</label>
              <Input
                value={form.name}
                onChange={(e) => form.setName(e.target.value)}
                placeholder="e.g. Store Officer (RTZ)"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => form.setDescription(e.target.value)}
                placeholder="Optional description of the role"
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox id="is_active" checked={form.isActive} onCheckedChange={(v) => form.setIsActive(!!v)} />
              <label htmlFor="is_active" className="text-sm">Active</label>
            </div>
          </div>

          {/* Middle column */}
          <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Created At</div>
              <div className="text-sm">{form.createdAt ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Updated At</div>
              <div className="text-sm">{form.updatedAt ?? "—"}</div>
            </div>
          </div>

          {/* Right column (status & quick stats) */}
          <div className="col-span-12 lg:col-span-4">
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Status</div>
                <div className={`text-xs px-2 py-0.5 rounded-full border ${form.isActive ? "bg-green-50" : "bg-amber-50"}`}>
                  {statusLabel}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Warehouses Assigned</div>
                  <div className="text-base font-medium">{form.assignedCount}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Role ID</div>
                  <div className="text-base font-mono">{form.roleId ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
