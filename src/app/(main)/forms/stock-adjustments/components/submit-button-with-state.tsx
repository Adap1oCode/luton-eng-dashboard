"use client";

import React from "react";
import { PermissionGate } from "@/components/auth/permissions-gate";
import SubmitButtonClient from "./submit-button-client";
import { useFormStateStore } from "./form-state-store";

type Props = {
  formId: string;
  label: string;
  permissions?: {
    any?: string[];
    all?: string[];
  };
};

/**
 * Submit button component that uses form state context to track dirty/submitting state.
 * Must be rendered within FormStateProvider.
 */
export default function SubmitButtonWithState({ formId, label, permissions }: Props) {
  const { isDirty, isSubmitting, isComplete } = useFormStateStore(formId);

  const button = (
    <SubmitButtonClient
      formId={formId}
      label={label}
      isDirty={isDirty}
      isSubmitting={isSubmitting}
      isComplete={isComplete}
    />
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

