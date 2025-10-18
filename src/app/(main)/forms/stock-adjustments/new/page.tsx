import React from "react";

import { NewStockAdjustmentPageHeader, NewStockAdjustmentToolbar } from "./components";
import { NewStockAdjustmentForm } from "./form-component";

export default function NewStockAdjustmentPage() {
  return (
    <div className="min-h-screen rounded-2xl border bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto w-full space-y-8 p-6">
        {/* Page Header */}
        <NewStockAdjustmentPageHeader />
        {/* Toolbar */}
        <NewStockAdjustmentToolbar />
        {/* Main Form */}
        <NewStockAdjustmentForm />
      </div>
    </div>
  );
}
