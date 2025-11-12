"use client";

import * as React from "react";
import { useRouteLoader, useBackgroundLoader } from "@/components/providers/app-loader-provider";
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
    backgroundLoadingPosition: _backgroundLoadingPosition = "top-right",
  }: FormShellWithLoadingProps) {
  const { show: showBlocking, hide: hideBlocking, patch: patchBlocking } = useRouteLoader();
  const { show: showBackground, hide: hideBackground, patch: patchBackground } = useBackgroundLoader();

  const initialLoaderRef = React.useRef<string | null>(null);
  const submittingLoaderRef = React.useRef<string | null>(null);
  const backgroundLoaderRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (isInitialLoading) {
      const payload = { title: initialLoadingTitle, message: initialLoadingDescription };
      if (initialLoaderRef.current) {
        patchBlocking(initialLoaderRef.current, payload);
      } else {
        initialLoaderRef.current = showBlocking(payload, "form:initial");
      }
    } else if (initialLoaderRef.current) {
      hideBlocking(initialLoaderRef.current);
      initialLoaderRef.current = null;
    }
  }, [
    isInitialLoading,
    initialLoadingTitle,
    initialLoadingDescription,
    showBlocking,
    hideBlocking,
    patchBlocking,
  ]);

  React.useEffect(() => {
    if (isSubmitting) {
      const payload = { title: submissionTitle, message: submissionDescription };
      if (submittingLoaderRef.current) {
        patchBlocking(submittingLoaderRef.current, payload);
      } else {
        submittingLoaderRef.current = showBlocking(payload, "form:submit");
      }
    } else if (submittingLoaderRef.current) {
      hideBlocking(submittingLoaderRef.current);
      submittingLoaderRef.current = null;
    }
  }, [isSubmitting, submissionTitle, submissionDescription, showBlocking, hideBlocking, patchBlocking]);

  React.useEffect(() => {
    if (isBackgroundLoading) {
      const payload = { title: backgroundLoadingMessage, message: undefined };
      if (backgroundLoaderRef.current) {
        patchBackground(backgroundLoaderRef.current, payload);
      } else {
        backgroundLoaderRef.current = showBackground(payload, "form:background.autosave");
      }
    } else if (backgroundLoaderRef.current) {
      hideBackground(backgroundLoaderRef.current);
      backgroundLoaderRef.current = null;
    }
  }, [isBackgroundLoading, backgroundLoadingMessage, showBackground, hideBackground, patchBackground]);

  React.useEffect(() => {
    return () => {
      if (initialLoaderRef.current) {
        hideBlocking(initialLoaderRef.current);
        initialLoaderRef.current = null;
      }
      if (submittingLoaderRef.current) {
        hideBlocking(submittingLoaderRef.current);
        submittingLoaderRef.current = null;
      }
      if (backgroundLoaderRef.current) {
        hideBackground(backgroundLoaderRef.current);
        backgroundLoaderRef.current = null;
      }
    };
  }, [hideBlocking, hideBackground]);

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
    </>
  );
}
