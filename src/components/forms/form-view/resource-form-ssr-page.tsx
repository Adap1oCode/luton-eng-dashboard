// -----------------------------------------------------------------------------
// FILE: src/components/forms/form-view/resource-form-ssr-page.tsx
// TYPE: Server Component
// PURPOSE:
//   Generic SSR wrapper for all form-based pages (New, Edit, etc.).
//   Mirrors `resource-ssr-page.tsx` but for DynamicForm + FormIsland.
//   Owns page chrome (FormShell) and common buttons (Cancel / Primary).
// -----------------------------------------------------------------------------

import React from "react";

import FormShell from "@/components/forms/shell/form-shell";
import FormIsland from "@/components/forms/shell/form-island";

interface ResourceFormSSRPageProps {
  title: string;
  headerDescription?: string | null;
  formId: string;

  // Transport-only config (no functions, all serializable)
  config: any;
  defaults?: Record<string, any>;
    options?: Record<string, any>;

  // Standard UI controls
  cancelHref?: string;
  primaryLabel?: string;
}

/**
 * Generic SSR wrapper for form-based resources.
 * Used by both New and Edit pages to eliminate duplication.
 */
export default function ResourceFormSSRPage({
  title,
  headerDescription,
  formId,
  config,
  defaults = {},
    options = {},
  cancelHref = `/forms/${config?.key ?? ""}`,
  primaryLabel = config?.submitLabel ?? "Save",
}: ResourceFormSSRPageProps) {
  return (
    <FormShell
      title={title}
      headerTitle={title}
      headerDescription={headerDescription ?? ""}
      actions={{
        secondaryLeft: cancelHref ? (
          <a
            href={cancelHref}
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm"
          >
            Cancel
          </a>
        ) : null,
        primary: (
          <button
            form={formId}
            type="submit"
            className="inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700"
          >
            {primaryLabel}
          </button>
        ),
      }}
    >
      <FormIsland
        formId={formId}
        config={config as any}
        defaults={defaults as Record<string, any>}
        options={options as any}
      />
    </FormShell>
  );
}
