"use client";

import React from "react";
import { EditWithTabs } from "@/components/history/edit-with-tabs";
import EditFormClient from "./edit-form-client";
import SubmitButtonState from "./submit-button-state";
import type { FormConfig, ResolvedOptions } from "@/lib/forms/types";

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
  primaryButtonPermissions?: {
    any?: string[];
    all?: string[];
  };
  onButtonStateChange?: (state: { isDirty: boolean; isSubmitting: boolean }) => void;
};

/**
 * Client wrapper for edit page that tracks form state and renders submit button.
 */
export default function EditPageWrapper({
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
  primaryButtonPermissions,
  onButtonStateChange,
}: Props) {
  return (
    <EditWithTabs
      resourceKey={resourceKey}
      recordId={recordId}
      formNode={
        <EditFormClient
          formId={formId}
          formConfig={formConfig}
          formDefaults={formDefaults}
          formOptions={formOptions}
          entryId={entryId}
          action={action}
          method={method}
          submitLabel={submitLabel}
          primaryButtonPermissions={primaryButtonPermissions}
          onButtonStateChange={onButtonStateChange}
        />
      }
      historyUI={historyUI}
    />
  );
}

