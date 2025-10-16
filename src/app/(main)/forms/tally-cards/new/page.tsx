// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally-cards/new/page.tsx
// TYPE: Client Component
// PURPOSE: Page for "Create New Tally Card" using imported components
// -----------------------------------------------------------------------------

import React from "react";

import { NewTallyCardPageHeader, NewTallyCardToolbar } from "./components";
import { NewTallyCardForm } from "./form-component";

export default function NewTallyCardPage() {
  return (
    <div className="min-h-screen rounded-2xl border bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto w-full space-y-8 p-6">
        {/* Page Header */}
        <NewTallyCardPageHeader />
        {/* Toolbar */}
        <NewTallyCardToolbar />
        {/* Main Form */}
        <NewTallyCardForm />
      </div>
    </div>
  );
}
