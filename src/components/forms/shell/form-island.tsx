// src/components/forms/shell/form-island.tsx
"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { DynamicForm } from "@/components/forms/dynamic-form";
import { useNotice } from "@/components/ui/notice";
import { BackgroundLoader } from "@/components/ui/background-loader";
import { extractErrorMessage } from "@/lib/forms/extract-error";
import type { FormConfig, ResolvedOptions } from "@/lib/forms/types";
import OptionsFlowDebug from "@/components/debug/options-flow-debug";

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
  warehousesOverride,
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
  warehousesOverride?: Array<{ id: string; label: string }>;
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
  // CRITICAL DEBUG: Log EXACTLY what FormIsland receives as props
  console.log(`[FormIsland] 🔵 RECEIVED AS PROPS (function signature):`, {
    options,
    optionsType: typeof options,
    optionsKeys: Object.keys(options ?? {}),
    hasWarehouses: 'warehouses' in (options ?? {}),
    warehousesValue: options?.warehouses,
    warehousesLength: options?.warehouses?.length ?? 0,
    warehousesIsArray: Array.isArray(options?.warehouses),
    fullOptionsStringified: JSON.stringify(options, null, 2),
    // Check if options is a plain object
    optionsConstructor: options?.constructor?.name,
    optionsIsPlainObject: options && typeof options === 'object' && options.constructor === Object
  });
  // Debug logging for options
  React.useEffect(() => {
    console.log(`[FormIsland] Received options:`, {
      keys: Object.keys(options ?? {}),
      fullObject: JSON.stringify(options, null, 2),
      counts: Object.keys(options ?? {}).map(k => ({ 
        key: k, 
        value: options?.[k],
        isArray: Array.isArray(options?.[k]),
        count: Array.isArray(options?.[k]) ? options[k].length : 'not-array'
      })),
    });
  }, [options]);
  const router = useRouter();
  const notice = useNotice();
  const [submitting, setSubmitting] = React.useState(false);

  // Notify parent of submission state changes (for optimistic UI)
  React.useEffect(() => {
    onSubmittingChange?.(submitting);
  }, [submitting, onSubmittingChange]);

  // DEBUG: Log what FormIsland is passing to DynamicForm
  React.useEffect(() => {
    console.log(`[FormIsland] Passing to DynamicForm:`, {
      optionsKeys: Object.keys(options ?? {}),
      hasWarehouses: 'warehouses' in (options ?? {}),
      warehousesLength: options?.warehouses?.length ?? 0,
      warehousesSample: options?.warehouses?.slice(0, 2),
      fullOptions: options,
      warehousesOverrideLength: warehousesOverride?.length ?? 0,
    });
  }, [options]);

  // DEBUG: Log right before render
  React.useEffect(() => {
    console.log(`[FormIsland] RENDER - options prop value:`, {
      keys: Object.keys(options ?? {}),
      hasWarehouses: 'warehouses' in (options ?? {}),
      warehousesLength: options?.warehouses?.length ?? 0,
      fullOptions: options,
      optionsStringified: JSON.stringify(options, null, 2)
    });
  });

  // Merge warehousesOverride into options if provided
  const mergedOptions = React.useMemo(() => {
    // Small, decisive rule: if client-side warehouses exist, prefer them and ignore base noise (like { id })
    if (warehousesOverride && Array.isArray(warehousesOverride) && warehousesOverride.length > 0) {
      return { warehouses: warehousesOverride } as ResolvedOptions;
    }
    return (options ?? ({} as ResolvedOptions)) as ResolvedOptions;
  }, [options, warehousesOverride]);

  // Log merged options
  React.useEffect(() => {
    console.log(`[FormIsland] ✅ Merged options computed:`, {
      keys: Object.keys(mergedOptions ?? {}),
      hasWarehouses: 'warehouses' in (mergedOptions ?? {}),
      warehousesLength: (mergedOptions as any)?.warehouses?.length ?? 0,
    });
  }, [mergedOptions]);

  return (
    <>
      {/* DEBUG: Show options passed to DynamicForm */}
      <OptionsFlowDebug 
        stage="FormIsland → DynamicForm" 
        options={mergedOptions}
        warehouses={(mergedOptions as any)?.warehouses}
      />
      
      {/* DEBUG: Show merged options we actually pass */}
      {(() => {
        const hasWarehouses = 'warehouses' in (mergedOptions ?? {} as any);
        const warehousesLength = (mergedOptions as any)?.warehouses?.length ?? 0;
        const hasValidWarehouses = hasWarehouses && warehousesLength > 0 && Array.isArray((mergedOptions as any)?.warehouses);
        const borderColor = hasValidWarehouses ? "border-green-500" : "border-red-500";
        const bgColor = hasValidWarehouses ? "bg-green-50" : "bg-red-50";
        const textColor = hasValidWarehouses ? "text-green-700" : "text-red-700";
        const icon = hasValidWarehouses ? "✅" : "❌";
        
        return (
          <div className={`mb-4 rounded-lg border-2 ${borderColor} ${bgColor} p-4 text-xs`}>
            <div className={`font-bold ${textColor} mb-2`}>{icon} FormIsland - Merged options used</div>
            <div className="grid grid-cols-2 gap-1">
              <div><strong>Keys:</strong> {Object.keys(mergedOptions ?? {}).join(", ") || "none"}</div>
              <div><strong>Has warehouses:</strong> {hasWarehouses ? "✅ YES" : "❌ NO"}</div>
              <div><strong>Warehouses length:</strong> {warehousesLength}</div>
              <div><strong>Type of options:</strong> {typeof mergedOptions}</div>
              <div className="col-span-2">
                <strong>Full options:</strong>
                <pre className="bg-white p-1 rounded mt-1 overflow-auto max-h-32 text-xs">
                  {JSON.stringify(mergedOptions, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        );
      })()}
      
      <DynamicForm
        id={formId} // ✅ DynamicForm expects `id`, not `formId`
        config={config}
        defaults={defaults}
        options={mergedOptions}
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
