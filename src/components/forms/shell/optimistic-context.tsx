"use client";

import * as React from "react";
import { createContext, useContext } from "react";

interface OptimisticState {
  deletedIds: Set<string>;
  optimisticTotal: number | null;
}

interface OptimisticContextValue {
  state: OptimisticState;
  markAsDeleted: (ids: string[]) => void;
  clearOptimisticState: () => void;
  setOptimisticTotal: (total: number) => void;
  isOptimisticallyDeleted: (id: string) => boolean;
}

const OptimisticContext = createContext<OptimisticContextValue | null>(null);

export function OptimisticProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<OptimisticState>({
    deletedIds: new Set(),
    optimisticTotal: null,
  });

  const markAsDeleted = React.useCallback((ids: string[]) => {
    setState((prev) => ({
      ...prev,
      deletedIds: new Set([...prev.deletedIds, ...ids]),
    }));
  }, []);

  const clearOptimisticState = React.useCallback(() => {
    setState({
      deletedIds: new Set(),
      optimisticTotal: null,
    });
  }, []);

  const setOptimisticTotal = React.useCallback((total: number) => {
    setState((prev) => ({
      ...prev,
      optimisticTotal: total,
    }));
  }, []);

  const isOptimisticallyDeleted = React.useCallback((id: string) => state.deletedIds.has(id), [state.deletedIds]);

  const value = React.useMemo(
    () => ({
      state,
      markAsDeleted,
      clearOptimisticState,
      setOptimisticTotal,
      isOptimisticallyDeleted,
    }),
    [state, markAsDeleted, clearOptimisticState, setOptimisticTotal, isOptimisticallyDeleted],
  );

  return <OptimisticContext.Provider value={value}>{children}</OptimisticContext.Provider>;
}

export function useOptimistic() {
  const context = useContext(OptimisticContext);
  if (!context) {
    throw new Error("useOptimistic must be used within an OptimisticProvider");
  }
  return context;
}
