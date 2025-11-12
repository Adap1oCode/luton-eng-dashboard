"use client";

import React from 'react';
import { useRouteLoader, useBackgroundLoader } from '@/components/providers/app-loader-provider';
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
    refetchPosition: _refetchPosition = 'top-right',
  ...pageShellProps
}: PageShellProps) {
    const { show: showBlocking, hide: hideBlocking, patch: patchBlocking } = useRouteLoader();
    const { show: showBackground, hide: hideBackground, patch: patchBackground } = useBackgroundLoader();

    const loadingRef = React.useRef<string | null>(null);
    const refetchRef = React.useRef<string | null>(null);

    React.useEffect(() => {
      if (isLoading) {
        const payload = { title: loadingTitle, message: loadingDescription };
        if (loadingRef.current) {
          patchBlocking(loadingRef.current, payload);
        } else {
          loadingRef.current = showBlocking(payload, "data:initial");
        }
      } else if (loadingRef.current) {
        hideBlocking(loadingRef.current);
        loadingRef.current = null;
      }
    }, [isLoading, loadingTitle, loadingDescription, showBlocking, hideBlocking, patchBlocking]);

    React.useEffect(() => {
      if (isRefetching) {
        const payload = { title: refetchMessage, message: undefined };
        if (refetchRef.current) {
          patchBackground(refetchRef.current, payload);
        } else {
          refetchRef.current = showBackground(payload, "data:refetch");
        }
      } else if (refetchRef.current) {
        hideBackground(refetchRef.current);
        refetchRef.current = null;
      }
    }, [isRefetching, refetchMessage, showBackground, hideBackground, patchBackground]);

    React.useEffect(() => {
      return () => {
        if (loadingRef.current) {
          hideBlocking(loadingRef.current);
          loadingRef.current = null;
        }
        if (refetchRef.current) {
          hideBackground(refetchRef.current);
          refetchRef.current = null;
        }
      };
    }, [hideBlocking, hideBackground]);

  return (
    <>
      <PageShell {...pageShellProps}>
        {children}
      </PageShell>
    </>
  );
}
