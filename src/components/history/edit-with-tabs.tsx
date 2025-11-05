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
import WarehousesDebug from "@/components/debug/warehouses-debug";
import OptionsFlowDebug from "@/components/debug/options-flow-debug";

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
    columns?: Array<{ key: string; label: string; width?: number; format?: "date" | "text" | "number" }>;
    tabBadgeCount?: boolean;
  };
}

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
  const [warehousesOverride, setWarehousesOverride] = React.useState<any[] | undefined>(undefined);
  const [isFetchingWarehouses, setIsFetchingWarehouses] = React.useState(false);

  // ALWAYS fetch warehouses client-side - server-side options are unreliable due to RSC serialization
  React.useEffect(() => {
    // Only fetch if we don't already have warehousesOverride
    if (warehousesOverride && Array.isArray(warehousesOverride) && warehousesOverride.length > 0) {
      console.log(`[EditWithTabs] ✅ Already have ${warehousesOverride.length} warehouses from previous fetch`);
      setIsFetchingWarehouses(false);
      return;
    }

    console.log(`[EditWithTabs] Fetching warehouses client-side...`);
    setIsFetchingWarehouses(true);
    
    // Fetch warehouses directly - this is the source of truth
    const fetchWarehouses = async () => {
      try {
        console.log(`[EditWithTabs] 🔵 Starting fetch to /api/warehouses?is_active=true`);
        const res = await fetch('/api/warehouses?is_active=true');
        console.log(`[EditWithTabs] 🔵 Fetch response status:`, res.status, res.statusText);
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log(`[EditWithTabs] 🔵 Raw API response:`, {
          isArray: Array.isArray(data),
          hasRows: 'rows' in data,
          hasData: 'data' in data,
          keys: Object.keys(data),
          dataSample: Array.isArray(data) ? data.slice(0, 2) : (data.rows?.slice(0, 2) ?? data.data?.slice(0, 2)),
        });
        
        const rows = Array.isArray(data) ? data : (data.rows ?? (Array.isArray(data.data) ? data.data : []));
        const warehouses = Array.isArray(rows) ? rows.map((w: any) => ({
          id: String(w.id),
          label: String(w.name || w.code || w.id)
        })) : [];
        
        console.log(`[EditWithTabs] ✅ Fetched ${warehouses.length} warehouses client-side:`, {
          warehouses: warehouses.slice(0, 3),
          totalLength: warehouses.length,
          allWarehouses: warehouses,
        });
        
        if (warehouses.length === 0) {
          console.warn(`[EditWithTabs] ⚠️ WARNING: Fetched 0 warehouses! This might be a problem.`);
        }
        
        console.log(`[EditWithTabs] 🔴 SETTING warehousesOverride state with ${warehouses.length} warehouses...`);
        setWarehousesOverride(warehouses);
        setIsFetchingWarehouses(false);
        console.log(`[EditWithTabs] ✅ State update queued for warehousesOverride`);
      } catch (err) {
        console.error(`[EditWithTabs] ❌ Failed to fetch warehouses:`, err);
        console.error(`[EditWithTabs] Error details:`, {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        setWarehousesOverride([]);
        setIsFetchingWarehouses(false);
      }
    };
    
    fetchWarehouses();
  }, []); // Empty deps - only run once on mount

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

  // Use override if warehouses are missing from formOptions
  const warehouses = warehousesOverride ?? formOptions?.warehouses;
  
  // Merge warehouses into formOptions if we fetched them client-side
  // CRITICAL: Always ensure we have a proper options object
  // PRIORITY: warehousesOverride takes precedence - it's client-side and guaranteed fresh
  const finalFormOptions = React.useMemo(() => {
    // Start with formOptions (from server) but prioritize client-side warehouses
    const base = formOptions ?? {};
    
    console.log(`[EditWithTabs] 🔍 Computing finalFormOptions:`, {
      warehousesOverrideLength: warehousesOverride?.length ?? 0,
      warehousesOverrideIsArray: Array.isArray(warehousesOverride),
      baseKeys: Object.keys(base),
      baseHasWarehouses: 'warehouses' in base,
      baseWarehousesLength: base.warehouses?.length ?? 0,
    });
    
    // CRITICAL FIX: Always create a new object to ensure React detects the change
    // If we have client-side warehouses, use them (they're always fresher)
    if (warehousesOverride && Array.isArray(warehousesOverride) && warehousesOverride.length > 0) {
      // Force new object reference - merge base properties but ensure warehouses is included
      const result = { 
        ...base, 
        warehouses: warehousesOverride  // Explicitly set warehouses
      };
      console.log(`[EditWithTabs] ✅ Using warehousesOverride:`, {
        resultKeys: Object.keys(result),
        warehousesLength: result.warehouses?.length ?? 0,
        warehousesInResult: 'warehouses' in result,
        result: result,
      });
      return result;
    }
    
    // If formOptions has warehouses, use those (but still create new object for stability)
    if (base.warehouses && Array.isArray(base.warehouses) && base.warehouses.length > 0) {
      console.log(`[EditWithTabs] ✅ Using formOptions warehouses:`, {
        warehousesLength: base.warehouses.length,
      });
      return { ...base }; // Create new object reference
    }
    
    // Otherwise, return base (might just have {id})
    // BUT: Create a new object reference so React detects changes when warehouses arrive
    console.log(`[EditWithTabs] ⚠️ No warehouses available yet, returning base:`, {
      baseKeys: Object.keys(base),
      base: base,
      note: 'This will update when warehousesOverride is set',
    });
    // Return a new object reference so React sees the change when warehouses arrive
    return { ...base };
  }, [formOptions, warehousesOverride]);
  
  // DEBUG: Log when warehousesOverride changes
  React.useEffect(() => {
    console.log(`[EditWithTabs] 🔄 warehousesOverride state changed:`, {
      warehousesOverrideLength: warehousesOverride?.length ?? 0,
      warehousesOverrideIsArray: Array.isArray(warehousesOverride),
      warehousesOverride: warehousesOverride?.slice(0, 2),
    });
  }, [warehousesOverride]);
  
  // DEBUG: Log what we're passing to FormIsland
  React.useEffect(() => {
    console.log(`[EditWithTabs] finalFormOptions:`, {
      keys: Object.keys(finalFormOptions ?? {}),
      hasWarehouses: 'warehouses' in (finalFormOptions ?? {}),
      warehousesLength: finalFormOptions?.warehouses?.length ?? 0,
      warehousesSample: finalFormOptions?.warehouses?.slice(0, 2),
      fullOptions: finalFormOptions,
      // CRITICAL: Log the key that will be used for FormIsland
      formIslandKey: (finalFormOptions?.warehouses && Array.isArray(finalFormOptions.warehouses) && finalFormOptions.warehouses.length > 0)
        ? `warehouses-${finalFormOptions.warehouses.length}-${JSON.stringify(finalFormOptions.warehouses[0]?.id ?? '')}`
        : 'no-warehouses',
    });
  }, [finalFormOptions]);
  
  // CRITICAL: Track if warehouses are ready to render FormIsland
  const warehousesReady = React.useMemo(() => {
    return finalFormOptions?.warehouses && Array.isArray(finalFormOptions.warehouses) && finalFormOptions.warehouses.length > 0;
  }, [finalFormOptions?.warehouses?.length]);
  
  // CRITICAL: Force re-render when warehouses arrive by creating a render counter
  const warehousesRenderKey = React.useMemo(() => {
    return warehousesReady ? `has-warehouses-${finalFormOptions?.warehouses?.length}` : 'no-warehouses';
  }, [warehousesReady, finalFormOptions?.warehouses?.length]);
  
  // CRITICAL: Create a stable options object that always includes warehouses when available
  const stableOptionsForFormIsland = React.useMemo(() => {
    // Always create a new object to ensure React detects changes
    const base = formOptions ?? {};
    
    // If we have warehouses in finalFormOptions, use them
    if (finalFormOptions?.warehouses && Array.isArray(finalFormOptions.warehouses) && finalFormOptions.warehouses.length > 0) {
      const result = { ...base, warehouses: finalFormOptions.warehouses };
      console.log(`[EditWithTabs] ✅ stableOptionsForFormIsland includes warehouses:`, {
        resultKeys: Object.keys(result),
        warehousesLength: result.warehouses.length,
      });
      return result;
    }
    
    // Otherwise return base (will be updated when warehouses arrive)
    console.log(`[EditWithTabs] ⚠️ stableOptionsForFormIsland NO warehouses yet`);
    return { ...base };
  }, [
    formOptions, 
    finalFormOptions?.warehouses?.length, // Use length to detect changes
    warehousesOverride?.length, // Also depend on warehousesOverride directly
  ]);
  
  console.log(`[EditWithTabs] 🔍 Stable options computed:`, {
    warehousesReady,
    stableOptionsKeys: Object.keys(stableOptionsForFormIsland),
    hasWarehousesInStable: 'warehouses' in stableOptionsForFormIsland,
    warehousesLengthInStable: stableOptionsForFormIsland.warehouses?.length ?? 0,
  });

  return (
    <>
      {/* DEBUG: Show warehouses */}
      <WarehousesDebug warehouses={warehouses} />
      
      {/* DEBUG: Show fetch status */}
      {isFetchingWarehouses && (
        <div className="mb-4 rounded-lg border-2 border-yellow-500 bg-yellow-50 p-4 text-center">
          <div className="font-bold text-yellow-700">⏳ Fetching warehouses client-side...</div>
        </div>
      )}
      
      {/* DEBUG: Show options flow */}
      <OptionsFlowDebug 
        stage="EditWithTabs - finalFormOptions" 
        options={finalFormOptions}
        warehouses={warehouses}
      />
      
      {/* Navigation Tabs Card - Exact match to requisitions */}
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
        // If we have formConfig, render FormIsland directly (preferred - avoids serialization issues)
        formConfig && formId ? (
          <>
            {/* DEBUG: Show what we're about to pass to FormIsland */}
            {(() => {
              const hasWarehouses = 'warehouses' in (finalFormOptions ?? {});
              const warehousesLength = finalFormOptions?.warehouses?.length ?? 0;
              const hasValidWarehouses = hasWarehouses && warehousesLength > 0 && Array.isArray(finalFormOptions?.warehouses);
              const borderColor = hasValidWarehouses ? "border-green-500" : "border-red-500";
              const bgColor = hasValidWarehouses ? "bg-green-50" : "bg-red-50";
              const textColor = hasValidWarehouses ? "text-green-700" : "text-red-700";
              const icon = hasValidWarehouses ? "✅" : "❌";
              
              return (
                <div className={`mb-4 rounded-lg border-2 ${borderColor} ${bgColor} p-4 text-xs`}>
                  <div className={`font-bold ${textColor} mb-2`}>{icon} EditWithTabs → FormIsland (props being passed)</div>
                  <div className="grid grid-cols-2 gap-1">
                    <div><strong>finalFormOptions keys:</strong> {Object.keys(finalFormOptions ?? {}).join(", ") || "none"}</div>
                    <div><strong>Has warehouses:</strong> {hasWarehouses ? "✅ YES" : "❌ NO"}</div>
                    <div><strong>Warehouses length:</strong> {warehousesLength}</div>
                    <div><strong>warehousesOverride length:</strong> {warehousesOverride?.length ?? "undefined"}</div>
                    <div className="col-span-2">
                      <strong>Full finalFormOptions:</strong>
                      <pre className="bg-white p-1 rounded mt-1 overflow-auto max-h-32 text-xs">
                        {JSON.stringify(finalFormOptions, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Render FormIsland with stable options - wait until warehouses are ready for a clean first mount */}
            {(() => {
              if (!warehousesReady) {
                return (
                  <div className="mb-4 rounded-lg border-2 border-blue-300 bg-blue-50 p-4 text-sm">
                    <div className="font-semibold text-blue-700">Preparing form…</div>
                    <div className="text-blue-700/80">Loading warehouse options…</div>
                  </div>
                );
              }
              // CRITICAL: Use stable options that explicitly includes warehouses
              console.log(`[EditWithTabs] 🟢 RENDERING FormIsland NOW with:`, {
                timestamp: new Date().toISOString(),
                warehousesRenderKey: warehousesRenderKey,
                warehousesReady: warehousesReady,
                stableOptionsForFormIsland: stableOptionsForFormIsland,
                optionsKeys: Object.keys(stableOptionsForFormIsland),
                hasWarehouses: 'warehouses' in stableOptionsForFormIsland,
                warehousesLength: stableOptionsForFormIsland.warehouses?.length ?? 0,
                warehousesSample: stableOptionsForFormIsland.warehouses?.slice(0, 2),
                // Verify the object structure
                fullOptions: JSON.stringify(stableOptionsForFormIsland, null, 2),
              });
              
              // Quick-win: pass a minimal options object that ONLY contains warehouses when available
              const directOptions = (warehousesOverride && Array.isArray(warehousesOverride) && warehousesOverride.length > 0)
                ? { warehouses: warehousesOverride }
                : (finalFormOptions?.warehouses ? { warehouses: finalFormOptions.warehouses } : (stableOptionsForFormIsland ?? {}));

              return (
                <FormIsland
                  key={warehousesRenderKey}
                  formId={formId}
                  config={formConfig}
                  defaults={formDefaults ?? {}}
                  options={directOptions as any}
                  warehousesOverride={warehousesOverride}
                />
              );
            })()}
          </>
        ) : formNode ? (
          // Fallback: if formNode is provided, use it (backward compatibility)
          formOptions && React.isValidElement(formNode)
            ? React.cloneElement(formNode as React.ReactElement<any>, {
                ...formNode.props,
                options: formOptions, // Override options prop
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




