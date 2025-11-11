"use client";

import React from "react";
import { CheckSquare, Square, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export type LocationRow = {
  id: string; // Temporary ID for React keys
  location: string;
  qty: number;
  pos?: number;
};

type Props = {
  locations: LocationRow[];
  onRemove: (id: string) => void;
  onToggleSelect: (id: string) => void;
  selectedLocations: Set<string>;
  onToggleAll: () => void;
  totalQty: number;
};

export default function LocationsTable({
  locations,
  onRemove,
  onToggleSelect,
  selectedLocations,
  onToggleAll,
  totalQty,
}: Props) {
  const allSelected = locations.length > 0 && selectedLocations.size === locations.length;

  return (
    <div className="mb-6 rounded-lg bg-white shadow-sm dark:bg-gray-800">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center dark:border-gray-700">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Locations</h3>
          {totalQty !== 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-200">
              Total Qty: {totalQty}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              selectedLocations.forEach((id) => onRemove(id));
            }}
            disabled={selectedLocations.size === 0}
            className="hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            title={selectedLocations.size === 0 ? "Select locations to remove" : undefined}
          >
            Remove Selected
          </Button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-12 p-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onToggleAll}
                  className="text-muted-foreground hover:text-foreground"
                  disabled={locations.length === 0}
                >
                  {allSelected ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              </th>
              <th className="text-muted-foreground p-3 text-left text-xs font-medium tracking-wider uppercase">
                Pos
              </th>
              <th className="text-muted-foreground p-3 text-left text-xs font-medium tracking-wider uppercase">
                Location
              </th>
              <th className="text-muted-foreground p-3 text-left text-xs font-medium tracking-wider uppercase">
                Quantity
              </th>
              <th className="text-muted-foreground w-20 p-3 text-left text-xs font-medium tracking-wider uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {locations.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No locations added. Use the "Add Location" section above to add locations.
                </td>
              </tr>
            ) : (
              locations.map((loc) => (
                <tr key={loc.id} className="hover:bg-muted/50 transition-colors">
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => onToggleSelect(loc.id)}
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                    >
                      {selectedLocations.has(loc.id) ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="p-3 text-sm text-gray-900 dark:text-gray-100">{loc.pos ?? "-"}</td>
                  <td className="p-3 text-sm text-gray-900 dark:text-gray-100">{loc.location}</td>
                  <td className="p-3 text-sm font-medium text-gray-900 dark:text-gray-100">{loc.qty}</td>
                  <td className="p-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(loc.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden">
        <div className="p-4">
          {locations.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No locations added. Use the "Add Location" section above to add locations.
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onToggleAll}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  {allSelected ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Select All</span>
              </div>

              <div className="space-y-4">
                {locations.map((loc) => (
                  <div
                    key={loc.id}
                    className="rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onToggleSelect(loc.id)}
                          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                        >
                          {selectedLocations.has(loc.id) ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {loc.location}
                          </div>
                          {loc.pos && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">Pos: {loc.pos}</div>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(loc.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-300">Quantity:</span>
                        <span className="ml-1 font-bold text-gray-900 dark:text-gray-100">{loc.qty}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

