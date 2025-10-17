// src/components/forms/shell/form-island.tsx
"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { DynamicForm } from "@/components/forms/dynamic-form";
import type { FormConfig, ResolvedOptions } from "@/lib/forms/types";

type EnhancedFormConfig = FormConfig & {
  submit?: (values: any) => Promise<any>;
  redirectTo?: (result: any) => string | null | undefined;
};

export default function FormIsland({
  config,
  defaults,
  options,
  formId,
}: {
  config: EnhancedFormConfig;
  defaults: Record<string, any>;
  options: ResolvedOptions;
  formId: string;
}) {
  const router = useRouter();

  return (
    <DynamicForm
      id={formId} // ensure DynamicForm forwards this to <form id={id}>
      config={config}
      defaults={defaults}
      options={options}
      onSubmit={async (values) => {
        try {
          const result =
            typeof config.submit === "function"
              ? await config.submit(values)
              : await (async () => {
                  const res = await fetch(`/api/forms/${config.key}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                  });
                  if (!res.ok) throw new Error(await res.text());
                  return res.json().catch(() => ({}));
                })();

          const next = (typeof config.redirectTo === "function" && config.redirectTo(result)) || `/forms/${config.key}`;

          router.push(next);
        } catch (err) {
          console.error("Form submit failed:", err);
          alert("Error saving. Please try again.");
        }
      }}
    />
  );
}
