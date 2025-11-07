"use client";

import React from "react";
import StockAdjustmentFormWrapper from "./stock-adjustment-form-wrapper";
import type { FormConfig, ResolvedOptions } from "@/lib/forms/types";

type Props = {
  formId: string;
  formConfig: FormConfig;
  formDefaults: Record<string, any>;
  formOptions: ResolvedOptions;
  entryId: string;
  action: string;
  method: "POST" | "PATCH";
  submitLabel: string;
  primaryButtonPermissions?: {
    any?: string[];
    all?: string[];
  };
  onButtonStateChange?: (state: { isDirty: boolean; isSubmitting: boolean }) => void;
};

/**
 * Client component that wraps the form and tracks dirty/submitting state
 * to pass to the submit button in the shell.
 */
export default function EditFormClient({
  formId,
  formConfig,
  formDefaults,
  formOptions,
  entryId,
  action,
  method,
  submitLabel,
  primaryButtonPermissions,
  onButtonStateChange,
}: Props) {
  const [isDirty, setIsDirty] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Notify parent of state changes
  React.useEffect(() => {
    onButtonStateChange?.({ isDirty, isSubmitting });
  }, [isDirty, isSubmitting, onButtonStateChange]);

  return (
    <StockAdjustmentFormWrapper
      formId={formId}
      config={formConfig}
      defaults={formDefaults}
      options={formOptions}
      entryId={entryId}
      action={action}
      method={method}
      submitLabel={submitLabel}
      onIsDirtyChange={setIsDirty}
      onSubmittingChange={setIsSubmitting}
    />
  );
}

