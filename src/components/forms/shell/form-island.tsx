// src/components/forms/shell/form-island.tsx
"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { DynamicForm } from "@/components/forms/dynamic-form";
import { useNotice } from "@/components/ui/notice";
import { BackgroundLoader } from "@/components/ui/background-loader";
import { extractErrorMessage } from "@/lib/forms/extract-error";
import type { FormConfig, ResolvedOptions } from "@/lib/forms/types";

type EnhancedFormConfig = FormConfig & {
  submit?: (values: any) => Promise<any>;
  redirectTo?: (result: any) => string | null | undefined;
  /** Optional explicit HTTP method to use when submit is not a function */
  method?: "POST" | "PATCH";
  /** Optional explicit endpoint to use when submit is not a function */
  action?: string;
};

export default function FormIsland({
  config,
  defaults,
  options,
  formId,
  hideInternalActions = true, // Shell owns footer; hide internal buttons by default
  // Loading props
  isFieldLoading = false,
  fieldLoadingMessage = "Loading options...",
  isAutoSaving = false,
  autoSaveMessage = "Saving draft...",
  isValidating = false,
  validationMessage = "Validating...",
  // Callback to notify parent of submission state (for optimistic UI)
  onSubmittingChange,
}: {
  config: EnhancedFormConfig;
  defaults: Record<string, any>;
  options: ResolvedOptions;
  formId: string;
  hideInternalActions?: boolean;
  // Loading props types
  isFieldLoading?: boolean;
  fieldLoadingMessage?: string;
  isAutoSaving?: boolean;
  autoSaveMessage?: string;
  isValidating?: boolean;
  validationMessage?: string;
  // Callback to notify parent of submission state
  onSubmittingChange?: (isSubmitting: boolean) => void;
}) {
  const router = useRouter();
  const notice = useNotice();
  const [submitting, setSubmitting] = React.useState(false);

  // Notify parent of submission state changes (for optimistic UI)
  React.useEffect(() => {
    onSubmittingChange?.(submitting);
  }, [submitting, onSubmittingChange]);

  return (
    <>
      <DynamicForm
        id={formId} // ✅ DynamicForm expects `id`, not `formId`
        config={config}
        defaults={defaults}
        options={options}
        hideInternalActions={hideInternalActions}
        onSubmit={async (values) => {
          // Guard against accidental double submit without relying on a `disabled` prop
          if (submitting) return;
          setSubmitting(true);
          try {
            const result =
              typeof config.submit === "function"
                ? await config.submit(values)
                : await (async () => {
                    // Prefer explicit transport from server; fallback to generic POST /api/forms/:key
                    const method = config.method ?? "POST";
                    const action = config.action ?? `/api/forms/${config.key}`;

                    const res = await fetch(action, {
                      method,
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(values),
                    });

                    if (!res.ok) {
                      const msg = await extractErrorMessage(res);
                      throw new Error(msg);
                    }

                    return res.json().catch(() => ({}));
                  })();

            const explicit = typeof config.redirectTo === "function" ? config.redirectTo(result) : null;

            const base = config.key ? `/forms/${config.key}` : `/forms`;
            const inferred = result?.id ? `${base}/${result.id}/edit` : base;

            router.push(explicit || inferred);
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message
                : typeof err === "string"
                  ? err
                  : "Error saving. Please review and try again.";

            // 🔔 Reusable ShadCN alert dialog
            notice.open({
              variant: "error",
              title: "Update failed",
              message,
            });
          } finally {
            setSubmitting(false);
          }
        }}
      />

      {/* Field loading indicator */}
      {isFieldLoading && (
        <BackgroundLoader
          message={fieldLoadingMessage}
          position="top-right"
          size="sm"
        />
      )}

      {/* Auto-save indicator */}
      {isAutoSaving && (
        <BackgroundLoader
          message={autoSaveMessage}
          position="bottom-right"
          size="sm"
        />
      )}

      {/* Validation indicator */}
      {isValidating && (
        <BackgroundLoader
          message={validationMessage}
          position="top-center"
          size="sm"
        />
      )}
    </>
  );
}
