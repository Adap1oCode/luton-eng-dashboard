"use client";

import * as React from "react";
import { usePageHeader } from "./page-header-context";
import { OptimisticProvider, useOptimistic } from "./optimistic-context";

type PageShellClientProps = {
  title: string;
  count?: number;
  children: React.ReactNode;
};

// Inner component that sets the context and syncs optimistic updates
// Must be inside OptimisticProvider
function PageShellContent({ title, count, children }: PageShellClientProps) {
  const { setPageHeader } = usePageHeader();
  const { state } = useOptimistic();

  // Calculate effective count (with optimistic updates)
  const effectiveCount = React.useMemo(() => {
    if (state.optimisticTotal != null) return state.optimisticTotal;
    const base = count ?? 0;
    const removed = state.deletedIds.size;
    return Math.max(0, base - removed);
  }, [count, state.optimisticTotal, state.deletedIds]);

  React.useEffect(() => {
    setPageHeader(title, effectiveCount);
    // Cleanup: clear header when component unmounts
    return () => {
      setPageHeader(null, null);
    };
  }, [title, effectiveCount, setPageHeader]);

  return <>{children}</>;
}

// Wrapper that provides OptimisticProvider and sets header context
// Note: PageHeaderProvider must be provided at layout level
export function PageShellClientWrapper({ title, count, children }: PageShellClientProps) {
  return (
    <OptimisticProvider>
      <PageShellContent title={title} count={count}>
        {children}
      </PageShellContent>
    </OptimisticProvider>
  );
}

