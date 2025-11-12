"use client";

/**
 * Generic warehouse filter dropdown component.
 * 
 * Features:
 * - Fetches user's allowed warehouses from session
 * - Shows dropdown if multiple warehouses available
 * - Shows readonly text if only one warehouse
 * - Updates URL query params to filter table
 * - Only displays if resource has warehouseScope config
 * 
 * Usage:
 * - Pass resourceKey to check if warehouse filtering is applicable
 * - Component handles all logic internally
 */

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WarehouseFilterDropdownProps {
  /** Whether the resource has warehouseScope config (checked on server side) */
  hasWarehouseScope?: boolean;
  /** Query param name for warehouse filter (default: "warehouse") */
  queryParamName?: string;
  /** Label text (default: "Warehouse") */
  label?: string;
  /** Use warehouse name as value instead of code (default: false) */
  useNameAsValue?: boolean;
}

interface SessionContext {
  allowedWarehouseCodes?: string[];
  allowedWarehouseIds?: string[];
  warehouseScope?: Array<{ warehouse_id: string; warehouse_code: string; warehouse_name: string }>;
}

interface Warehouse {
  code: string;
  name: string;
  is_active?: boolean | null;
}

export function WarehouseFilterDropdown({
  hasWarehouseScope = false,
  queryParamName = "warehouse",
  label = "Warehouse",
  useNameAsValue = false,
}: WarehouseFilterDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Fetch user session to get allowed warehouses
  const { data: sessionData, isLoading: isLoadingSession } = useQuery<SessionContext>({
    queryKey: ["session", "warehouses"],
    queryFn: async () => {
      const res = await fetch("/api/me/role");
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch warehouse details - only show warehouses user has access to
  const { data: warehouses, isLoading: isLoadingWarehouses } = useQuery<Warehouse[]>({
    queryKey: ["warehouses", sessionData?.allowedWarehouseCodes],
    queryFn: async () => {
      // Fetch all warehouses
      const res = await fetch("/api/warehouses?pageSize=1000");
      if (!res.ok) throw new Error("Failed to fetch warehouses");
      const data = await res.json();
      const allWarehouses = data.rows || [];
      
      // Filter to only allowed warehouses (explicit access only)
      if (!sessionData?.allowedWarehouseCodes || sessionData.allowedWarehouseCodes.length === 0) {
        return [];
      }
      
      return allWarehouses
        .filter((w: Warehouse) => sessionData.allowedWarehouseCodes?.includes(w.code))
        .sort((a: Warehouse, b: Warehouse) => (a.code || "").localeCompare(b.code || ""));
    },
    enabled: !!sessionData, // Enable once session data is loaded
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (warehouses change infrequently)
  });

  const currentWarehouse = searchParams.get(queryParamName) || null;

  // Don't show if:
  // 1. Resource doesn't have warehouseScope
  // 2. Still loading session data
  if (!hasWarehouseScope) {
    return null;
  }

  if (isLoadingSession) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Loading...</span>
      </div>
    );
  }

  // If no warehouses available, don't show
  if (!warehouses || warehouses.length === 0) {
    return null;
  }

  const handleWarehouseChange = (value: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (value === "ALL" || !value) {
      sp.delete(queryParamName);
    } else {
      sp.set(queryParamName, value);
    }
    // Reset to page 1 when filter changes
    sp.set("page", "1");
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  // Single warehouse - show readonly text
  if (warehouses.length === 1) {
    const warehouse = warehouses[0];
    const displayName = warehouse?.name || warehouse.code;

    return (
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{label}:</Label>
        <span className="text-sm text-gray-700 dark:text-gray-300">{displayName}</span>
      </div>
    );
  }

  // Multiple warehouses - show dropdown
  // Show loading state while warehouses are being fetched
  if (isLoadingWarehouses) {
    return (
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{label}:</Label>
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  const warehouseOptions = warehouses || [];
  // Only show "All" option if user has access to multiple warehouses
  const warehouseOptionsWithAll = warehouses.length > 1
    ? [
        { value: "ALL", label: "All Warehouses" },
        ...warehouseOptions.map((w) => ({
          value: useNameAsValue ? (w.name || w.code) : w.code,
          label: w.name || w.code,
        })),
      ]
    : warehouseOptions.map((w) => ({
        value: useNameAsValue ? (w.name || w.code) : w.code,
        label: w.name || w.code,
      }));

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="warehouse-filter" className="text-sm font-medium">
        {label}:
      </Label>
      <Select
        value={currentWarehouse || "ALL"}
        onValueChange={handleWarehouseChange}
      >
        <SelectTrigger id="warehouse-filter" className="h-9 w-[180px]">
          <SelectValue placeholder="Select warehouse..." />
        </SelectTrigger>
        <SelectContent>
          {warehouseOptionsWithAll.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

