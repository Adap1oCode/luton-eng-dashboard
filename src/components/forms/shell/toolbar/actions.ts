"use client";

import { useRouter } from "next/navigation";

import { useSelectionStore } from "../selection/selection-store";

import type { ActionConfig } from "./types";

/**
 * Provides generic handlers for built-in OR configured actions.
 * - Injects selectedIds from the selection store where applicable.
 * - For GET with target _blank -> opens new tab/window.
 * - For POST/DELETE -> sends JSON { ids: string[] } when selection exists.
 */
export function useToolbarActions(actionConfig?: ActionConfig) {
  const router = useRouter();
  const selectedIds = useSelectionStore((s) => s.selectedIds);

  async function callEndpoint(key: string) {
    if (!actionConfig || !actionConfig[key]) return;
    const def = actionConfig[key];
    const ids = selectedIds ?? [];

    // Add confirmation for delete actions
    if (key === "deleteSelected" && ids.length > 0) {
      const confirmed = window.confirm(
        `Are you sure you want to delete ${ids.length} selected record(s)? This action cannot be undone.`,
      );
      if (!confirmed) return;
    }

    // Interpolate :id for single-selected
    const oneId = ids.length === 1 ? ids[0] : undefined;
    const url = oneId ? def.endpoint.replace(/:id\b/g, oneId) : def.endpoint;

    if (def.method === "GET" && def.target === "_blank") {
      window.open(url, "_blank");
      return;
    }

    const init: RequestInit = { method: def.method, headers: {} };
    if (def.method !== "GET") {
      init.headers = { "content-type": "application/json" };
      (init as any).body = JSON.stringify({ ids });
    }

    const res = await fetch(url, init);
    if (res.ok) {
      if (key === "deleteSelected") {
        alert(`Successfully deleted ${ids.length} record(s)`);
      }
      router.refresh();
    } else {
      alert("Operation failed. Please try again.");
    }
  }

  // Built-in shorthands using conventional keys
  return {
    bulkDelete: () => callEndpoint("bulkDelete"),
    duplicateSelected: () => callEndpoint("duplicateSelected"),
    exportCsv: () => callEndpoint("exportCsv"),
    printReport: () => callEndpoint("printReport"),
    // generic
    run: callEndpoint,
  };
}
