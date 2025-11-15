"use client";

import { useState, useMemo } from "react";

import { ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Props = {
  form: {
    roleFamily: string | null;

    // source lists
    allPermissions: { key: string; description: string | null }[];
    selectedPermission: string | null;
    setSelectedPermission: (key: string | null) => void;

    // actions
    addPermission: () => Promise<void>;
    isMutating: boolean;

    // right panel info
    selectedPermissionInfo: { key: string; description: string | null } | null;
  };
};

export function AddPermissionSection({ form }: Props) {
  const [open, setOpen] = useState(true);

  // Filter out already assigned permissions
  const availablePermissions = useMemo(() => {
    // This will be filtered by the parent component if needed
    return form.allPermissions;
  }, [form.allPermissions]);

  return (
    <Card className="@container/card">
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Add Permission</CardTitle>
          <CardDescription>Assign a permission to this role family.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Toggle">
          {open ? <ChevronDown /> : <ChevronRight />}
        </Button>
      </CardHeader>

      {open && (
        <CardContent className="grid grid-cols-12 gap-6">
          {/* Left column: inputs */}
          <div className="col-span-12 space-y-4 lg:col-span-6">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Permission</label>
              <Select value={form.selectedPermission ?? ""} onValueChange={(v) => form.setSelectedPermission(v)}>
                <SelectTrigger className="rounded-lg border-2 border-gray-300 bg-white focus:border-indigo-500 dark:border-gray-600 dark:bg-gray-700">
                  <SelectValue placeholder="Select permission..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePermissions.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-3">
              <Button
                onClick={form.addPermission}
                disabled={!form.roleFamily || !form.selectedPermission || form.isMutating}
                className="px-6 py-2 text-base"
              >
                Add Permission
              </Button>
            </div>
          </div>
          {/* Right column: read-only info about selected permission */}
          <div className="col-span-12 space-y-4 lg:col-span-6">
            <div className="rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-gray-700">
              <div className="mb-1 text-xs font-medium text-gray-700 dark:text-gray-300">Selected Permission</div>
              <div className="text-sm text-gray-900 dark:text-gray-100">
                {form.selectedPermissionInfo
                  ? (
                      <div>
                        <div className="font-medium">{form.selectedPermissionInfo.key}</div>
                        {form.selectedPermissionInfo.description && (
                          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            {form.selectedPermissionInfo.description}
                          </div>
                        )}
                      </div>
                    )
                  : "None selected"}
              </div>
            </div>
            {!form.roleFamily && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-900/20">
                <div className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  Note: Set a Role Family to assign permissions
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}





