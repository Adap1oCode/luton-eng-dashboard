"use client";

import { useState } from "react";

import { ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  form: {
    // role fields
    roleId: string | null;
    name: string;
    description: string;
    isActive: boolean;
    roleFamily: string | null;
    createdAt: string | null;
    updatedAt: string | null;

    // setters
    setName: (v: string) => void;
    setDescription: (v: string) => void;
    setIsActive: (v: boolean) => void;
    setRoleFamily: (v: string | null) => void;

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
        <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Toggle">
          {open ? <ChevronDown /> : <ChevronRight />}
        </Button>
      </CardHeader>

      {open && (
        <CardContent className="grid grid-cols-12 gap-6">
          {" "}
          {/* زيادة الـ gap للوضوح */}
          {/* Left column */}
          <div className="col-span-12 space-y-4 lg:col-span-4">
            {" "}
            {/* زيادة الـ space-y */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role Name</label>{" "}
              {/* تحسين الليبل */}
              <Input
                className="mt-1 rounded-lg border-2 border-gray-300 bg-white focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                value={form.name}
                onChange={(e) => form.setName(e.target.value)}
                placeholder="e.g. Store Officer (RTZ)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <Textarea
                className="mt-1 rounded-lg border-2 border-gray-300 bg-white focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                value={form.description}
                onChange={(e) => form.setDescription(e.target.value)}
                placeholder="Optional description of the role"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role Family</label>
              <Input
                className="mt-1 rounded-lg border-2 border-gray-300 bg-white focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                value={form.roleFamily ?? ""}
                onChange={(e) => form.setRoleFamily(e.target.value || null)}
                placeholder="e.g. STORE_OFFICERS"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Role family for permission inheritance (e.g. STORE_OFFICERS)
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              {" "}
              {/* زيادة الـ space-x */}
              <Checkbox
                id="is_active"
                checked={form.isActive}
                onCheckedChange={(v) => form.setIsActive(!!v)}
                className="h-5 w-5 border-2 border-gray-400"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active
              </label>
            </div>
          </div>
          {/* Middle column */}
          <div className="col-span-12 grid grid-cols-2 gap-4 lg:col-span-4">
            {" "}
            {/* زيادة الـ gap */}
            <div>
              {" "}
              {/* إضافة border و padding للتحديد */}
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Created At</div>{" "}
              {/* تحسين الليبل */}
              <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">{form.createdAt ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Updated At</div>
              <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">{form.updatedAt ?? "—"}</div>
            </div>
          </div>
          {/* Right column (status & quick stats) */}
          <div className="col-span-12 lg:col-span-4">
            <div className="space-y-3 rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-gray-700">
              {" "}
              {/* تحسين الـ border و padding */}
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Status</div>
                <div
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${form.isActive ? "border-green-200 bg-green-100 text-green-800" : "border-amber-200 bg-amber-100 text-amber-800"}`}
                >
                  {" "}
                  {/* جعل الـ badge أكبر وأوضح */}
                  {statusLabel}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Warehouses Assigned</div>
                  <div className="text-base font-medium text-gray-900 dark:text-gray-100">{form.assignedCount}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Role ID</div>
                  <div className="font-mono text-base text-gray-900 dark:text-gray-100">{form.roleId ?? "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
