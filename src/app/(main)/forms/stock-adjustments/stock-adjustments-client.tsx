"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import PageShell from "@/components/forms/shell/page-shell";
import { stockAdjustmentsViewConfig } from "./view.config";
import { stockAdjustmentsToolbar, stockAdjustmentsActions } from "./toolbar.config";
import { fetchResourcePageClient } from "@/lib/api/client-fetch";
import { QuickFiltersClient } from "./quick-filters-client";

interface StockAdjustmentsClientProps {
  initialData: any[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
}

export function StockAdjustmentsClient({
  initialData,
  initialTotal,
  initialPage,
  initialPageSize,
}: StockAdjustmentsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Extract current filters from URL
  const statusFilter = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "10");
  
  // Column width state management - persist across data fetches
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const columnWidthsRef = useRef<Record<string, number>>({});
  
  // Handle column width changes from ResourceTableClient
  const handleColumnWidthsChange = useCallback((widths: Record<string, number>) => {
    setColumnWidths(widths);
    columnWidthsRef.current = widths;
  }, []);
  
  // Build extra query parameters for filtering
  const buildExtraQuery = useCallback(() => {
    const extraQuery: Record<string, any> = { raw: "true" };
    
    if (statusFilter && statusFilter !== "ALL") {
      if (statusFilter === "ACTIVE") {
        extraQuery.qty_gt = 0;
        extraQuery.qty_not_null = true;
      } else if (statusFilter === "ZERO") {
        extraQuery.qty_eq = 0;
      }
    }
    
    return extraQuery;
  }, [statusFilter]);

  // React Query for data fetching with comprehensive error handling
  const { data, error, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["stock-adjustments", page, pageSize, statusFilter],
    queryFn: async () => {
      const extraQuery = buildExtraQuery();
      console.log(`[Stock Adjustments Client] Fetching data with filters:`, extraQuery);
      
      const result = await fetchResourcePageClient<any>({
        endpoint: "/api/v_tcm_user_tally_card_entries",
        page,
        pageSize,
        extraQuery,
      });
      
      return result;
    },
    initialData: { rows: initialData, total: initialTotal },
    staleTime: 30000, // 30 seconds
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error && error.message.includes('4')) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Handle query errors and success with useEffect
  useEffect(() => {
    if (isError && error) {
      console.error('[Stock Adjustments Client] Query error:', error);
      toast.error('Failed to load stock adjustments', {
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
  }, [isError, error, data, refetch]);

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
    params.set("page", "1");
    
    // Use replace to avoid page refresh - this will trigger React Query to refetch
    router.replace(`/forms/stock-adjustments?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Handle pagination changes
  const handlePaginationChange = useCallback((newPage: number, newPageSize: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    params.set("pageSize", newPageSize.toString());
    
    router.replace(`/forms/stock-adjustments?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Enhanced error handling with graceful degradation
  if (isError && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500 text-lg font-semibold">
          Unable to load stock adjustments
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
        title="Stock Adjustments"
        count={data?.total || 0}
        toolbarConfig={stockAdjustmentsToolbar}
        toolbarActions={stockAdjustmentsActions}
        enableAdvancedFilters={false}
        quickFiltersSlot={
          <QuickFiltersClient
            onFilterChange={handleFilterChange}
            currentFilters={{ status: statusFilter || "ALL" }}
          />
        }
      >
        <ResourceTableClient
          config={stockAdjustmentsViewConfig}
          initialRows={data?.rows || []}
          initialTotal={data?.total || 0}
          page={page}
          pageSize={pageSize}
          showInlineExportButton={false}
          onColumnWidthsChange={handleColumnWidthsChange}
          initialColumnWidths={columnWidths}
        />
      </PageShell>
      
      {/* Loading indicator - only show for initial load, not for background refetches */}
      {isLoading && !data && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-700">Loading stock adjustments...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Background loading indicator for refetches */}
      {isFetching && data && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-white rounded-lg p-3 shadow-lg border">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-700">Updating...</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
