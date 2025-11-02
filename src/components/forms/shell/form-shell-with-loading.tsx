"use client";

import * as React from "react";
import { FullScreenLoader } from "@/components/ui/enhanced-loader";
import { BackgroundLoader } from "@/components/ui/background-loader";
import FormShell from "./form-shell";
import type { FormShellProps } from "./form-shell";

interface FormShellWithLoadingProps extends FormShellProps {
  // Initial loading (for edit forms loading existing data)
  isInitialLoading?: boolean;
  initialLoadingTitle?: string;
  initialLoadingDescription?: string;
  
  // Submission loading (for form submission)
  isSubmitting?: boolean;
  submissionTitle?: string;
  submissionDescription?: string;
  
  // Background operations (auto-save, validation, etc.)
  isBackgroundLoading?: boolean;
  backgroundLoadingMessage?: string;
  backgroundLoadingPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

export default function FormShellWithLoading({
  // FormShell props
  title,
  headerTitle,
  headerDescription,
  headerIcon,
  alertSlot,
  children,
  actions,
  stickyFooter,
  contentMaxWidthClassName,
  
  // Loading props
  isInitialLoading = false,
  initialLoadingTitle = "Loading Form",
  initialLoadingDescription = "Please wait...",
  
  isSubmitting = false,
  submissionTitle = "Saving Changes",
  submissionDescription = "Please wait...",
  
  isBackgroundLoading = false,
  backgroundLoadingMessage = "Processing...",
  backgroundLoadingPosition = 'top-right',
}: FormShellWithLoadingProps) {
  return (
    <>
      <FormShell
        title={title}
        headerTitle={headerTitle}
        headerDescription={headerDescription}
        headerIcon={headerIcon}
        alertSlot={alertSlot}
        actions={actions}
        stickyFooter={stickyFooter}
        contentMaxWidthClassName={contentMaxWidthClassName}
      >
        {children}
      </FormShell>
      
      {/* Initial loading (edit forms) */}
      {isInitialLoading && (
        <FullScreenLoader
          title={initialLoadingTitle}
          description={initialLoadingDescription}
          size="md"
        />
      )}
      
      {/* Submission loading */}
      {isSubmitting && (
        <FullScreenLoader
          title={submissionTitle}
          description={submissionDescription}
          size="sm"
        />
      )}
      
      {/* Background loading (auto-save, validation, etc.) */}
      {isBackgroundLoading && (
        <BackgroundLoader
          message={backgroundLoadingMessage}
          position={backgroundLoadingPosition}
          size="md"
        />
      )}
    </>
  );
}
