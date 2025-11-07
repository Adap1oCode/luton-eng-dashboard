"use client";

// src/components/history/edit-with-tabs.tsx
// Generic tabs wrapper for edit pages with History tab
// Renders exact requisitions tabs HTML structure

import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import HistoryTable from "./history-table";

import FormIsland from "@/components/forms/shell/form-island";
import type { FormConfig, ResolvedOptions } from "@/lib/forms/types";

interface EditWithTabsProps {
  resourceKey: string;
  recordId: string;
  // Instead of passing JSX, pass the data needed to render FormIsland
  formConfig?: FormConfig;
  formDefaults?: Record<string, any>;
  formOptions?: ResolvedOptions;
  formId?: string;
  // Fallback: if formNode is provided, use it (for backward compatibility)
  formNode?: React.ReactElement;
  historyUI?: {
    columns?: Array<{ key: string; label: string; width?: number; format?: "date" | "text" | "number" | "boolean" }>;
    tabBadgeCount?: boolean;
  };
}

/**
 * Generic tabs wrapper for edit pages with History tab.
 * Passes formOptions directly to FormIsland - no modification needed.
 */
export default function EditWithTabs({ 
  resourceKey, 
  recordId, 
  formConfig,
  formDefaults,
  formOptions,
  formId,
  formNode,
  historyUI 
}: EditWithTabsProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "history">("edit");
  const queryClient = useQueryClient();

  // Prefetch history on mount (runs immediately)
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["history", resourceKey, recordId],
      queryFn: async () => {
        const res = await fetch(`/api/resources/${resourceKey}/${recordId}/history`);
        if (!res.ok) {
          throw new Error("Failed to prefetch history");
        }
        return res.json();
      },
    });
  }, [resourceKey, recordId, queryClient]);

  // Get total count for badge (only if tabBadgeCount is enabled)
  const { data: historyData } = useQuery({
    queryKey: ["history", resourceKey, recordId],
    queryFn: async () => {
      const res = await fetch(`/api/resources/${resourceKey}/${recordId}/history`);
      if (!res.ok) {
        throw new Error("Failed to fetch history");
      }
      return res.json() as Promise<{ rows: any[]; total: number }>;
    },
    enabled: historyUI?.tabBadgeCount === true,
    staleTime: 60000,
    gcTime: 300000,
  });

  const totalCount = historyData?.total;

  return (
    <>
      {/* Navigation Tabs Card */}
      <div className="mb-6 rounded-lg bg-white shadow-sm dark:bg-gray-800">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "edit"
                ? "border-b-2 border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-200"
                : "border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
            }`}
            onClick={() => setActiveTab("edit")}
          >
            Edit
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "border-b-2 border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-200"
                : "border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
            }`}
            onClick={() => setActiveTab("history")}
          >
            History
            {historyUI?.tabBadgeCount && totalCount !== undefined && (
              <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">
                {totalCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Conditional Content */}
      {activeTab === "edit" ? (
        formConfig && formId ? (
          <FormIsland
            formId={formId}
            config={formConfig}
            defaults={formDefaults ?? {}}
            options={formOptions ?? {}}
          />
        ) : formNode ? (
          formOptions && React.isValidElement(formNode)
            ? React.cloneElement(formNode as React.ReactElement<any>, {
                ...formNode.props,
                options: formOptions,
              })
            : formNode
        ) : null
      ) : (
        <HistoryTable
          resourceKey={resourceKey}
          recordId={recordId}
          columnsConfig={historyUI?.columns ?? []}
          queryKey={["history", resourceKey, recordId]}
        />
      )}
    </>
  );
}




