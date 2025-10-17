import React from "react";

import {
  NewTallyCardPageHeader as NewStockAdjustmentPageHeader,
  NewTallyCardToolbar as NewStockAdjustmentToolbar,
} from "../../tally-cards/new/components";
import { NewTallyCardForm as NewStockAdjustmentForm } from "../../tally-cards/new/form-component";

export default function NewStockAdjustmentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-7xl space-y-8 p-6">
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
