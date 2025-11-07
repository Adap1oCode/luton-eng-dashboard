"use client";

import React from "react";
import { PermissionGate } from "@/components/auth/permissions-gate";

type Props = {
  formId: string;
  label: string;
  permissions?: {
    any?: string[];
    all?: string[];
  };
  isDirty: boolean;
  isSubmitting: boolean;
  isComplete: boolean;
};

/**
 * Client-side submit button that respects form dirty state.
 * Must be used with SubmitButtonWrapper inside the form to track isDirty.
 */
export default function SubmitButtonClient({ formId, label, permissions, isDirty, isSubmitting, isComplete }: Props) {
  const button = (
    <button
      form={formId}
      type="submit"
      disabled={!isDirty || !isComplete || isSubmitting}
      className="inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
      title={!isDirty ? "No changes to save" : !isComplete ? "Complete required fields" : undefined}
    >
      {isSubmitting ? "Saving…" : label}
    </button>
  );

  if (permissions) {
    return (
      <PermissionGate any={permissions.any} all={permissions.all}>
        {button}
      </PermissionGate>
    );
  }

  return button;
}

