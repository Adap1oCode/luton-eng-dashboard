"use client";

import React from "react";
import dynamic from "next/dynamic";
import EditWithTabs from "@/components/history/edit-with-tabs";
import type { FormConfig, ResolvedOptions } from "@/lib/forms/types";

// Dynamically import form wrapper with SSR disabled to avoid Radix UI hydration warnings
// This prevents server-side rendering of Radix UI components which generate different IDs on server vs client
const StockAdjustmentFormWrapper = dynamic(
  () => import("./stock-adjustment-form-wrapper").then((mod) => ({ default: mod.default })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Loading form...</div>
      </div>
    ),
  }
);

type Props = {
  resourceKey: string;
  recordId: string;
  formId: string;
  formConfig: FormConfig;
  formDefaults: Record<string, any>;
  formOptions: ResolvedOptions;
  entryId: string;
  action: string;
  method: "POST" | "PATCH";
  submitLabel: string;
  historyUI?: any;
};

export default function EditPageClient({
  resourceKey,
  recordId,
  formId,
  formConfig,
  formDefaults,
  formOptions,
  entryId,
  action,
  method,
  submitLabel,
  historyUI,
}: Props) {
  return (
    <EditWithTabs
      resourceKey={resourceKey}
      recordId={recordId}
      formNode={
        <StockAdjustmentFormWrapper
          formId={formId}
          config={formConfig}
          defaults={formDefaults}
          options={formOptions}
          entryId={entryId}
          action={action}
          method={method}
          submitLabel={submitLabel}
        />
      }
      historyUI={historyUI}
    />
  );
}
