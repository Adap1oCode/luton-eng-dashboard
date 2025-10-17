// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally-cards/edit/[id]/page.tsx
// TYPE: Server Component
// PURPOSE: Page for "Edit Tally Card" using imported components
// -----------------------------------------------------------------------------

import React from "react";

import { EditTallyCardPageHeader, EditTallyCardToolbar } from "./components.tsx";
import { EditTallyCardForm } from "./form-component.tsx";

type EditTallyCardPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function EditTallyCardPage({ params }: EditTallyCardPageProps) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return (
    <div className="min-h-screen rounded-2xl border bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto w-full space-y-8 p-6">
        {/* Page Header */}
        <EditTallyCardPageHeader id={id} />
        {/* Toolbar */}
        <EditTallyCardToolbar id={id} />
        {/* Main Form */}
        <EditTallyCardForm id={id} />
      </div>
    </div>
  );
}
