"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type Permission = {
  key: string;
  description: string | null;
};

type Props = {
  form: {
    assignedPermissions: Permission[];
    permissionsQuery: string;
    setPermissionsQuery: (v: string) => void;

    selectedPermissions: Set<string>;
    togglePermission: (key: string) => void;
    clearPermissionSelection: () => void;

    removeSelectedPermissions: () => Promise<void>;
    isMutating: boolean;
  };
};

export function PermissionsTable({ form }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filtered = useMemo(() => {
    const q = (form.permissionsQuery ?? "").trim().toUpperCase();
    return form.assignedPermissions.filter((p) => {
      if (q && !p.key.toUpperCase().includes(q) && !(p.description ?? "").toUpperCase().includes(q)) return false;
      return true;
    });
  }, [form.assignedPermissions, form.permissionsQuery]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = () => {
    if (form.selectedPermissions.size === filtered.length && filtered.length > 0) {
      form.clearPermissionSelection();
    } else {
      filtered.forEach((p) => {
        if (!form.selectedPermissions.has(p.key)) {
          form.togglePermission(p.key);
        }
      });
    }
  };

  return (
    <Card className="@container/card">
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Assigned Permissions</CardTitle>
          <CardDescription>Permissions assigned to this role family.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Filter…"
            value={form.permissionsQuery}
            onChange={(e) => form.setPermissionsQuery(e.target.value)}
            className="w-[220px]"
          />
          <Button
            variant="destructive"
            onClick={form.removeSelectedPermissions}
            disabled={!form.selectedPermissions.size || form.isMutating}
          >
            Remove
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border border-gray-200 text-sm dark:border-gray-500">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="w-10 p-3">
                  <Checkbox
                    checked={form.selectedPermissions.size === filtered.length && filtered.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="p-3 text-left font-medium">Permission Key</th>
                <th className="p-3 text-left font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((p) => {
                const isSelected = form.selectedPermissions.has(p.key);

                return (
                  <tr key={p.key} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => form.togglePermission(p.key)}
                        aria-label={`Select ${p.key}`}
                      />
                    </td>
                    <td className="p-3 font-mono text-sm">{p.key}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400">{p.description ?? "—"}</td>
                  </tr>
                );
              })}
              {!paginatedData.length && (
                <tr>
                  <td colSpan={3} className="text-muted-foreground py-6 text-center">
                    No permissions assigned. Set a role family and add permissions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-2 md:hidden">
          {paginatedData.map((p) => {
            const isSelected = form.selectedPermissions.has(p.key);
            return (
              <div key={p.key} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium font-mono text-sm">{p.key}</div>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => form.togglePermission(p.key)}
                    aria-label={`Select ${p.key}`}
                  />
                </div>
                <div className="text-muted-foreground text-xs">{p.description ?? "—"}</div>
              </div>
            );
          })}
          {!paginatedData.length && (
            <div className="text-muted-foreground py-6 text-center text-sm">
              No permissions assigned. Set a role family and add permissions.
            </div>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of{" "}
              {filtered.length} permissions
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

