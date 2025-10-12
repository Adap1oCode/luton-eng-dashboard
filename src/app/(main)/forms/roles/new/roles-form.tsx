"use client";

import { useRolesForm } from "../hooks/use-roles-form";
import { AddWarehouseSection } from "../sections/add-warehouse-section";
import FooterActions from "../sections/footer-actions";
import { RoleDetailsSection } from "../sections/role-details-section";
import { WarehousesTable } from "../sections/warehouses-table";

export default function RolesForm({ initialRoleId = null }: { initialRoleId?: string | null }) {
  const form = useRolesForm({ initialRoleId });

  return (
    <div className="p-8">
      {" "}
      {/* زيادة المسافات الداخلية للحداثة */}
      <div className="space-y-8">
        {" "}
        {/* زيادة المسافات بين الأقسام */}
        {/* Role Details Section */}
        <div className="">
          {" "}
          {/* تحسين الشادو والحواف */}
          <RoleDetailsSection form={form} />
        </div>
        {/* Add Warehouse Section */}
        <div className="">
          <AddWarehouseSection form={form} />
        </div>
        {/* Warehouses Table Section */}
        <div className="">
          <WarehousesTable form={form} />
        </div>
        {/* Footer Actions */}
        <div className="">
          {" "}
          {/* مسافات أكبر في الفوتر */}
          <FooterActions onCancel={form.onCancel} onSave={form.onSave} isSaving={form.isMutating} />
        </div>
      </div>
    </div>
  );
}
