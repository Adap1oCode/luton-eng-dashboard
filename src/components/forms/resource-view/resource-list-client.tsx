"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import PageShell from "@/components/forms/shell/page-shell";
import { FullScreenLoader } from "@/components/ui/enhanced-loader";
import { BackgroundLoader } from "@/components/ui/background-loader";
import { fetchResourcePageClient } from "@/lib/api/client-fetch";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import type { ToolbarConfig, ActionConfig, ChipsConfig } from "@/components/forms/shell/toolbar/types";

// Quick filter type
export type QuickFilter = {
  id: string;
  label: string;
  type: "text" | "enum" | "boolean" | "date";
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string;
  toQueryParam?: (value: string) => Record<string, any>;
};

export interface ResourceListClientProps<TRow = any> {
  // Identity & routing
  title: string;
  routeSegment: string;
  apiEndpoint: string;
  queryKeyBase: string;
  
  // Configuration
  viewConfig: BaseViewConfig<TRow>;
  toolbar: ToolbarConfig;
  actions: ActionConfig;
  quickFilters?: QuickFilter[];
  
  // Data mapping
  toRow: (data: any) => TRow;
  
  // SSR initial data
  initialData: TRow[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  
  // Optional overrides
  buildExtraQuery?: (filters: Record<string, string>) => Record<string, any>;
  pageParamKeys?: { page?: string; pageSize?: string };
  persistColumnWidths?: boolean;
  columnWidthsKey?: string;
  
  // React Query options
  staleTime?: number;
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: (attemptIndex: number) => number;
  };
}

export function ResourceListClient<TRow = any>({
  title,
  routeSegment,
  apiEndpoint,
  queryKeyBase,
  viewConfig,
  toolbar,
  actions,
  quickFilters = [],
  toRow,
  initialData,
  initialTotal,
  initialPage,
  initialPageSize,
  buildExtraQuery,
  pageParamKeys = { page: "page", pageSize: "pageSize" },
  persistColumnWidths = true,
  columnWidthsKey,
  staleTime = 30000,
  retryConfig = { maxRetries: 3, retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000) },
}: ResourceListClientProps<TRow>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Extract current filters and pagination from URL
  const currentFilters: Record<string, string> = {};
  quickFilters.forEach(filter => {
    const value = searchParams.get(filter.id);
    if (value) {
      currentFilters[filter.id] = value;
    }
  });
  
  const page = parseInt(searchParams.get(pageParamKeys.page || "page") || initialPage.toString());
  const pageSize = parseInt(searchParams.get(pageParamKeys.pageSize || "pageSize") || initialPageSize.toString());
  
  // Column width state management - persist across data fetches
  const storageKey = columnWidthsKey || `${routeSegment}-column-widths`;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (persistColumnWidths && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });
  const columnWidthsRef = useRef<Record<string, number>>({});
  
  // Handle column width changes from ResourceTableClient
  const handleColumnWidthsChange = useCallback((widths: Record<string, number>) => {
    setColumnWidths(widths);
    columnWidthsRef.current = widths;
    
    // Persist to localStorage
    if (persistColumnWidths && typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(widths));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [persistColumnWidths, storageKey]);
  
  // Build extra query parameters for filtering
  const buildExtraQueryFromFilters = useCallback(() => {
    const extraQuery: Record<string, any> = { raw: "true" };
    
    // Use custom buildExtraQuery if provided
    if (buildExtraQuery) {
      Object.assign(extraQuery, buildExtraQuery(currentFilters));
    } else {
      // Use quickFilters toQueryParam mapping
      quickFilters.forEach(filter => {
        const value = currentFilters[filter.id];
        if (value && filter.toQueryParam) {
          Object.assign(extraQuery, filter.toQueryParam(value));
        }
      });
    }
    
    return extraQuery;
  }, [currentFilters, buildExtraQuery, quickFilters]);

  // React Query for data fetching with comprehensive error handling
  const { data, error, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: [queryKeyBase, page, pageSize, ...Object.values(currentFilters)],
    queryFn: async () => {
      const extraQuery = buildExtraQueryFromFilters();
      
      if (process.env.NODE_ENV === "development") {
        console.log(`[${queryKeyBase}] Fetching data with filters:`, extraQuery);
      }
      
      const result = await fetchResourcePageClient<any>({
        endpoint: apiEndpoint,
        page,
        pageSize,
        extraQuery,
      });
      
      return result;
    },
    initialData: { rows: initialData, total: initialTotal },
    staleTime,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error && error.message.includes('4')) {
        return false;
      }
      // Retry up to maxRetries times for other errors
      return failureCount < (retryConfig.maxRetries || 3);
    },
    retryDelay: retryConfig.retryDelay || ((attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)),
  });

  // Handle query errors and success with useEffect
  useEffect(() => {
    if (isError && error) {
      console.error(`[${queryKeyBase}] Query error:`, error);
      toast.error(`Failed to load ${title.toLowerCase()}`, {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        action: {
          label: 'Retry',
          onClick: () => refetch(),
        },
      });
    } else if (data && !isError) {
      // Clear any previous error toasts on successful fetch
      toast.dismiss();
    }
  }, [isError, error, data, refetch, title, queryKeyBase]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== "ALL") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    
    // Reset to page 1 when filters change
    params.set(pageParamKeys.page || "page", "1");
    
    // Use replace to avoid page refresh - this will trigger React Query to refetch
    router.replace(`/forms/${routeSegment}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, routeSegment, pageParamKeys.page]);

  // Handle pagination changes
  const handlePaginationChange = useCallback((newPage: number, newPageSize: number) => {
    const params = new URLSearchParams(searchParams);
    params.set(pageParamKeys.page || "page", newPage.toString());
    params.set(pageParamKeys.pageSize || "pageSize", newPageSize.toString());
    
    router.replace(`/forms/${routeSegment}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, routeSegment, pageParamKeys]);

  // Enhanced error handling with graceful degradation
  if (isError && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500 text-lg font-semibold">
          Unable to load {title.toLowerCase()}
        </div>
        <div className="text-gray-600 text-sm text-center max-w-md">
          {error instanceof Error ? error.message : "An unexpected error occurred. Please try again."}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageShell
        title={title}
        count={data?.total || 0}
        toolbarConfig={toolbar}
        toolbarActions={actions}
        enableAdvancedFilters={false}
      >
        <ResourceTableClient
          config={viewConfig}
          initialRows={data?.rows || []}
          initialTotal={data?.total || 0}
          page={page}
          pageSize={pageSize}
          showInlineExportButton={false}
        />
      </PageShell>
      
      {/* Enhanced loading indicator - only show for initial load, not for background refetches */}
      {isLoading && !data && (
        <FullScreenLoader
          title={`Loading ${title}`}
          description="Fetching your data..."
          size="md"
        />
      )}
      
      {/* Background loading indicator for refetches */}
      {isFetching && data && (
        <BackgroundLoader
          message="Updating..."
          position="top-right"
          size="md"
        />
      )}
    </>
  );
}

// Quick filters client component
interface QuickFiltersClientProps {
  onFilterChange?: (newFilters: Record<string, string>) => void;
  currentFilters?: Record<string, string>;
  quickFilters: QuickFilter[];
}

function QuickFiltersClient({ onFilterChange, currentFilters = {}, quickFilters }: QuickFiltersClientProps) {
  const handleValueChange = (filterId: string, value: string) => {
    if (onFilterChange) {
      const newFilters = { ...currentFilters, [filterId]: value };
      onFilterChange(newFilters);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {quickFilters.map((filter) => (
        <div key={filter.id} className="flex items-center gap-2">
          <label htmlFor={`quick-filter-${filter.id}`} className="text-sm font-medium">
            {filter.label}:
          </label>
          <select
            id={`quick-filter-${filter.id}`}
            value={currentFilters[filter.id] ?? filter.defaultValue ?? ""}
            onChange={(e) => handleValueChange(filter.id, e.target.value)}
            className="w-[180px] px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            {filter.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
