"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { FormConfig, ResolvedOptions } from "@/lib/forms/types";
import { DynamicForm } from "@/components/forms/dynamic-form";

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

  return (
    <DynamicForm
      id={formId}                 // ✅ DynamicForm expects `id`, not `formId`
      config={config}
      defaults={defaults}
      options={options}
      hideInternalActions={hideInternalActions}
      onSubmit={async (values) => {
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
                  if (!res.ok) throw new Error(await res.text());
                  return res.json().catch(() => ({}));
                })();

            const explicit =
            typeof config.redirectTo === "function" ? config.redirectTo(result) : null;
            const base = config.key ? `/forms/${config.key}` : `/forms`;
            const inferred = result?.id ? `${base}/${result.id}/edit` : base;
            router.push(explicit || inferred);

        } catch (err) {
          console.error("Form submit failed:", err);
          alert("Error saving. Please try again.");
        }
      }}
    />
  );
}
