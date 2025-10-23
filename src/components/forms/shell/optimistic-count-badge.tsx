"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";

import { useOptimistic } from "./optimistic-context";

type Props = { count?: number };

export default function OptimisticCountBadge({ count }: Props) {
  const { state } = useOptimistic();

  // Call hooks unconditionally before any early returns
  const effectiveCount = React.useMemo(() => {
    if (state.optimisticTotal != null) return state.optimisticTotal;
    const base = count ?? 0;
    const removed = state.deletedIds.size;
    return Math.max(0, base - removed);
  }, [count, state.optimisticTotal, state.deletedIds]);

  if (state.loading) {
    return (
      <Badge variant="outline" className="ml-2">
        <span className="relative inline-flex h-4 w-4 items-center justify-center align-middle">
          <span className="border-primary/30 h-4 w-4 rounded-full border-2" />
          <span className="border-primary absolute inset-0 animate-spin rounded-full border-t-2" />
        </span>
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="ml-2">
      {effectiveCount}
    </Badge>
  );
}
