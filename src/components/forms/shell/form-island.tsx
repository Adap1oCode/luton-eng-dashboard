// src/components/forms/shell/form-island.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { FormConfig, ResolvedOptions } from "@/lib/forms/types";
import { DynamicForm } from "@/components/forms/dynamic-form";
import { useNotice } from "@/components/ui/notice";
import { extractErrorMessage } from "@/lib/forms/extract-error";

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
}: {
  config: EnhancedFormConfig;
  defaults: Record<string, any>;
  options: ResolvedOptions;
  formId: string;
  hideInternalActions?: boolean;
}) {
  const router = useRouter();
  const notice = useNotice();
  const [submitting, setSubmitting] = React.useState(false);

  return (
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

          const explicit =
            typeof config.redirectTo === "function"
              ? config.redirectTo(result)
              : null;

          const base = config.key ? `/forms/${config.key}` : `/forms`;
          const inferred =
            (result as any)?.id ? `${base}/${(result as any).id}/edit` : base;

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
  );
}
