// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/edit/[id]/page.tsx
// TYPE: Server Component
// PURPOSE: Page for "Edit Stock Adjustment" using imported components
// -----------------------------------------------------------------------------

import React from "react";

import { EditStockAdjustmentPageHeader, EditStockAdjustmentToolbar } from "./components";
import { EditStockAdjustmentForm } from "./form-component";

type EditStockAdjustmentPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function EditStockAdjustmentPage({ params }: EditStockAdjustmentPageProps) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return (
    <div className="min-h-screen rounded-2xl border bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto w-full space-y-8 p-6">
        {/* Page Header */}
        <EditStockAdjustmentPageHeader id={id} />
        {/* Toolbar */}
        <EditStockAdjustmentToolbar id={id} />
        {/* Main Form */}
        <EditStockAdjustmentForm id={id} />
      </div>
    </div>
  );
}
