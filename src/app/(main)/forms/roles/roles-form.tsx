"use client";

import { Card } from "@/components/ui/card";

import { useRolesForm } from "./hooks/use-roles-form";
import { AddWarehouseSection } from "./sections/add-warehouse-section";
import { AddPermissionSection } from "./sections/add-permission-section";
import FooterActions from "./sections/footer-actions";
import { RoleDetailsSection } from "./sections/role-details-section";
import { WarehousesTable } from "./sections/warehouses-table";
import { PermissionsTable } from "./sections/permissions-table";

export default function RolesForm({ initialRoleId = null }: { initialRoleId?: string | null }) {
  // Centralized form state/logic (create & edit handled inside the hook)
  const form = useRolesForm({ initialRoleId });

  return (
    <div className="space-y-4">
      {/* Role details (code, name, active, etc.) */}
      <RoleDetailsSection form={form} />

      {/* Assign a warehouse to this role */}
      <AddWarehouseSection form={form} />

      {/* Current warehouse assignments for this role */}
      <WarehousesTable form={form} />

      {/* Assign a permission to this role family */}
      <AddPermissionSection form={form} />

      {/* Current permission assignments for this role family */}
      <PermissionsTable form={form} />

      {/* Footer actions (Cancel / Save) */}
      <Card className="p-4">
        <FooterActions onCancel={form.onCancel} onSave={form.onSave} isSaving={form.isMutating} />
      </Card>
    </div>
  );
}
