"use client";

import React from "react";
import { PermissionGate } from "@/components/auth/permissions-gate";
import SubmitButtonClient from "./submit-button-client";

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
 * Submit button component that respects form dirty state.
 * Must receive isDirty and isSubmitting from parent component that tracks form state.
 */
export default function SubmitButtonState({ formId, label, permissions, isDirty, isSubmitting, isComplete }: Props) {
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

