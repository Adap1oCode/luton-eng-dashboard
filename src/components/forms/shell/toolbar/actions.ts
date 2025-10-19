"use client";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { useConfirmDialog } from "@/components/ui/confirm-dialog";

import { useOptimistic } from "../optimistic-context";
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
  const { confirm, ConfirmComponent } = useConfirmDialog();
  const { markAsDeleted, clearOptimisticState } = useOptimistic();

  async function callEndpoint(key: string) {
    if (!actionConfig || !actionConfig[key]) return;
    const def = actionConfig[key];
    const ids = selectedIds ?? [];

    // Add confirmation for delete actions
    if (key === "deleteSelected" && ids.length > 0) {
      confirm({
        title: "Delete Selected Items",
        description: `Are you sure you want to delete ${ids.length} selected record(s)? This action cannot be undone.`,
        confirmText: "Delete",
        variant: "destructive",
        onConfirm: async () => {
          await performDelete(def, ids);
        },
      });
      return;
    }

    await performAction(def, ids);
  }

  async function performDelete(def: any, ids: string[]) {
    // Interpolate :id for single-selected
    const oneId = ids.length === 1 ? ids[0] : undefined;
    const url = oneId ? def.endpoint.replace(/:id\b/g, oneId) : def.endpoint;

    const init: RequestInit = { method: def.method, headers: {} };
    if (def.method !== "GET") {
      init.headers = { "content-type": "application/json" };
      (init as any).body = JSON.stringify({ ids });
    }

    try {
      // Optimistically mark as deleted
      markAsDeleted(ids);

      const res = await fetch(url, init);
      if (res.ok) {
        toast.success(`Successfully deleted ${ids.length} record(s)`);
        // Clear optimistic state and refresh
        clearOptimisticState();
        router.refresh();
      } else {
        // Revert optimistic state on error
        clearOptimisticState();
        toast.error("Operation failed. Please try again.");
      }
    } catch (error) {
      // Revert optimistic state on error
      clearOptimisticState();
      toast.error("Operation failed. Please try again.");
    }
  }

  async function performAction(def: any, ids: string[]) {
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
      router.refresh();
    } else {
      toast.error("Operation failed. Please try again.");
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
    ConfirmComponent,
  };
}
