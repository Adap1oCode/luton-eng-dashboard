"use client";

/**
 * Reusable dialog component for displaying inventory information.
 * Fetches inventory data by item_number and displays key information in a clean layout.
 */

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface InventoryInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemNumber: string | number | null;
}

interface InventoryData {
  item_number: number | null;
  description: string | null;
  category: string | null;
  unit_of_measure: string | null;
  total_available: number | null;
  item_cost: number | null;
  on_order: number | null;
  committed: number | null;
}

export function InventoryInfoDialog({ open, onOpenChange, itemNumber }: InventoryInfoDialogProps) {
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !itemNumber) {
      setInventoryData(null);
      setError(null);
      return;
    }

    const fetchInventoryData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch inventory data by filtering for the specific item_number
        // Use the filters parameter format expected by the API
        const response = await fetch(
          `/api/inventory-current?filters[item_number][value]=${encodeURIComponent(itemNumber)}&filters[item_number][mode]=equals&pageSize=1&raw=true`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch inventory data: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.rows && data.rows.length > 0) {
          const row = data.rows[0];
          setInventoryData({
            item_number: row.item_number != null ? Number(row.item_number) : null,
            description: row.description ?? null,
            category: row.category ?? null,
            unit_of_measure: row.unit_of_measure ?? null,
            total_available: row.total_available != null ? Number(row.total_available) : null,
            item_cost: row.item_cost != null ? Number(row.item_cost) : null,
            on_order: row.on_order != null ? Number(row.on_order) : null,
            committed: row.committed != null ? Number(row.committed) : null,
          });
        } else {
          setError("No inventory data found for this item number.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load inventory information.");
        console.error("[InventoryInfoDialog] Error fetching inventory:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryData();
  }, [open, itemNumber]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, onOpenChange]);

  const formatNumber = (value: number | null): string => {
    if (value === null || value === undefined) return "—";
    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return "—";
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div ref={dialogRef} className="w-full max-w-5xl rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Inventory Information</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading inventory data...</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {!loading && !error && inventoryData && (
            <div className="space-y-6">
            {/* Item Number - Prominent */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                Item Number
              </label>
              <div className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
                {inventoryData.item_number != null ? String(inventoryData.item_number) : "—"}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Description
              </label>
              <div className="rounded-lg border border-gray-200 bg-white p-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                {inventoryData.description ?? <span className="text-muted-foreground">—</span>}
              </div>
            </div>

            {/* Grid Layout for Key Information */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Category */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Category
                </label>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                  {inventoryData.category ?? <span className="text-muted-foreground">—</span>}
                </div>
              </div>

              {/* Unit of Measure */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Unit of Measure
                </label>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                  {inventoryData.unit_of_measure ?? <span className="text-muted-foreground">—</span>}
                </div>
              </div>

              {/* Total Available */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Total Available
                </label>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-lg font-bold text-green-900 dark:border-green-800 dark:bg-green-900/30 dark:text-green-100">
                  {formatNumber(inventoryData.total_available)}
                </div>
              </div>

              {/* Item Cost */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Item Cost
                </label>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-lg font-bold text-blue-900 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100">
                  {formatCurrency(inventoryData.item_cost)}
                </div>
              </div>

              {/* On Order */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  On Order
                </label>
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-lg font-bold text-orange-900 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-100">
                  {formatNumber(inventoryData.on_order)}
                </div>
              </div>

              {/* Committed */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Committed
                </label>
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-lg font-bold text-purple-900 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-100">
                  {formatNumber(inventoryData.committed)}
                </div>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

