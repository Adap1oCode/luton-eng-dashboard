"use client";

import React from "react";
import { useFormContext } from "react-hook-form";

type Props = {
  formId: string;
  label: string;
  className?: string;
  onIsDirtyChange?: (isDirty: boolean) => void;
};

/**
 * Submit button that is disabled when form has no changes (for SCD-2 tables).
 * Prevents creating duplicate records when nothing has changed.
 * Must be rendered inside FormProvider context.
 */
export default function FormSubmitButton({ formId, label, className, onIsDirtyChange }: Props) {
  const { formState } = useFormContext();
  const isDirty = formState.isDirty;
  const isSubmitting = formState.isSubmitting;

  // Notify parent of isDirty state changes (for buttons outside FormProvider)
  React.useEffect(() => {
    onIsDirtyChange?.(isDirty);
  }, [isDirty, onIsDirtyChange]);

  return (
    <button
      form={formId}
      type="submit"
      disabled={!isDirty || isSubmitting}
      className={className ?? "inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"}
      title={!isDirty ? "No changes to save" : undefined}
    >
      {isSubmitting ? "Saving…" : label}
    </button>
  );
}

