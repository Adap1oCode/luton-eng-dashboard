// -----------------------------------------------------------------------------
// FILE: src/components/forms/form-view/resource-form-ssr-page.tsx
// TYPE: Server Component
// PURPOSE:
//   Generic SSR wrapper for all form-based pages (New, Edit, etc.).
//   Mirrors `resource-ssr-page.tsx` but for DynamicForm + FormIsland.
//   Owns page chrome (FormShell) and common buttons (Cancel / Primary).
// -----------------------------------------------------------------------------

import React from "react";
import Link from "next/link";

import FormIsland from "@/components/forms/shell/form-island";
import FormShell from "@/components/forms/shell/form-shell";

// IMPORTANT: Align with what FormIsland expects.
// Derive types directly from FormIsland props so we never depend on where they're declared.
type FormIslandProps = React.ComponentProps<typeof FormIsland>;
type EnhancedFormConfig = FormIslandProps["config"];
type ResolvedOptions = NonNullable<FormIslandProps["options"]>;
// If your project exports these from a different module, change the import above
// to the correct source. The goal is to match the types used in `FormIsland`.
// (The error you pasted shows FormIsland wants `EnhancedFormConfig`.)

interface ResourceFormSSRPageProps {
  title: string;
  headerDescription?: string | null;

  // This must match the <form id="..."> rendered inside the client component
  formId: string;

  // EXACT shape required by FormIsland:
  config: EnhancedFormConfig;

  // Optional initial values and select options:
  defaults?: Record<string, any>;
  options?: ResolvedOptions; // optional to keep call sites unchanged

  // Standard UI controls
  cancelHref?: string;     // defaults to /forms/<formsRouteSegment|key>
  primaryLabel?: string;   // defaults to config.submitLabel || "Save"

  // Optional flags
  hideCancel?: boolean;
  hidePrimary?: boolean;
}

// Safely build a default cancel URL using common fields on EnhancedFormConfig.
// Prefer `formsRouteSegment`; fall back to `key`; finally `/forms`.
function resolveDefaultCancelHref(config: EnhancedFormConfig): string {
  const segment =
    (config as any)?.formsRouteSegment ??
    (config as any)?.key ??
    "";
  return segment ? `/forms/${segment}` : "/forms";
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
  options = {} as ResolvedOptions, // safe empty default
  cancelHref,
  primaryLabel,
  hideCancel = false,
  hidePrimary = false,
}: ResourceFormSSRPageProps) {
  const computedCancelHref = cancelHref ?? resolveDefaultCancelHref(config);
  const computedPrimaryLabel = primaryLabel ?? (config as any)?.submitLabel ?? "Save";

  return (
    <FormShell
      title={title}
      headerTitle={title}
      headerDescription={headerDescription ?? ""}
      actions={{
        secondaryLeft:
          hideCancel ? null : (
            <Link href={computedCancelHref} className="inline-flex items-center rounded-md border px-4 py-2 text-sm">
              Cancel
            </Link>
          ),
        primary: hidePrimary ? null : (
          <button
            form={formId}
            type="submit"
            className="inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700"
          >
            {computedPrimaryLabel}
          </button>
        ),
      }}
    >
      {/* FormIsland is a client component; pass exactly what it expects */}
      <FormIsland
        formId={formId}
        config={config}
        defaults={defaults}
        options={options}
      />
    </FormShell>
  );
}
