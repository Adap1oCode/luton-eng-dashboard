"use client";

import React from 'react';
import { FullScreenLoader } from '@/components/ui/enhanced-loader';
import { BackgroundLoader } from '@/components/ui/background-loader';
import PageShell, { PageShellProps } from './page-shell';

// This component acts as a client-side wrapper for PageShell (a Server Component)
// to enable client-side loading indicators at the page level.
export default function PageShellWithLoading({
  children,
  isLoading = false,
  loadingTitle = "Loading...",
  loadingDescription = "Please wait...",
  isRefetching = false,
  refetchMessage = "Updating...",
  refetchPosition = 'top-right',
  ...pageShellProps
}: PageShellProps) {
  return (
    <>
      <PageShell {...pageShellProps}>
        {children}
      </PageShell>

      {/* Full-screen loader for initial page load or blocking operations */}
      {isLoading && (
        <FullScreenLoader
          title={loadingTitle}
          description={loadingDescription}
          size="md"
        />
      )}

      {/* Background loader for non-blocking refetches or updates */}
      {isRefetching && (
        <BackgroundLoader
          message={refetchMessage}
          position={refetchPosition}
          size="md"
        />
      )}
    </>
  );
}
