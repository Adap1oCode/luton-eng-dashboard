"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";

import { useOptimistic } from "./optimistic-context";

type Props = { count?: number };

export default function OptimisticCountBadge({ count }: Props) {
  const { state } = useOptimistic();

  const displayCount = React.useMemo(() => {
    if (state.optimisticTotal !== null) {
      return state.optimisticTotal;
    }
    if (typeof count === "number") {
      return Math.max(0, count - state.deletedIds.size);
    }
    return count;
  }, [count, state.optimisticTotal, state.deletedIds.size]);

  if (typeof displayCount !== "number") return null;

  return (
    <Badge variant="outline" className="ml-2">
      {displayCount}
    </Badge>
  );
}
