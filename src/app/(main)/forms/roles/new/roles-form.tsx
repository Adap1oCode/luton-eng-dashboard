"use client";

import { Card } from "@/components/ui/card";

import { useRolesForm } from "../hooks/use-roles-form";
import { AddWarehouseSection } from "../sections/add-warehouse-section";
import FooterActions from "../sections/footer-actions"; // keep as-is if this path exists
import { RoleDetailsSection } from "../sections/role-details-section";
import { WarehousesTable } from "../sections/warehouses-table";

export default function RolesForm({ initialRoleId = null }: { initialRoleId?: string | null }) {
  const form = useRolesForm({ initialRoleId });

  return (
    <div className="space-y-4">
      {/* Top card: Role Details (same layout as OrderDetailsSection) */}
      <RoleDetailsSection form={form} />

      {/* Middle card: Add Warehouse (same layout as AddItemSection) */}
      <AddWarehouseSection form={form} />

      {/* Bottom card: Assigned Warehouses (same layout as ItemsTable) */}
      <WarehousesTable form={form} />

      {/* Footer (identical buttons/layout) */}
      <Card className="p-4">
        <FooterActions onCancel={form.onCancel} onSave={form.onSave} isSaving={form.isMutating} />
      </Card>
    </div>
  );
}
