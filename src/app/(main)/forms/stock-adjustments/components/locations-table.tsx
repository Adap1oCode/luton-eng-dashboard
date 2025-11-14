"use client";

import React, { useState } from "react";
import { CheckSquare, Square, Trash2, Edit2, X, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { STOCK_ADJUSTMENT_REASON_CODES, DEFAULT_REASON_CODE } from "@/lib/config/stock-adjustment-reason-codes";

export type LocationRow = {
  id: string; // Temporary ID for React keys
  location: string;
  qty: number;
  pos?: number;
  reason_code?: string; // Reason code for this specific location
};

type AdjustmentType = "increase" | "decrease" | "set";

type Props = {
  locations: LocationRow[];
  onRemove: (id: string) => void;
  onToggleSelect: (id: string) => void;
  selectedLocations: Set<string>;
  onToggleAll: () => void;
  totalQty: number;
  onUpdateQuantity?: (locationId: string, newQty: number) => void;
  onUpdateReasonCode?: (locationId: string, newReasonCode: string) => void;
};

export default function LocationsTable({
  locations,
  onRemove,
  onToggleSelect,
  selectedLocations,
  onToggleAll,
  totalQty,
  onUpdateQuantity,
  onUpdateReasonCode,
}: Props) {
  const allSelected = locations.length > 0 && selectedLocations.size === locations.length;
  
  // State for inline adjustment
  const [adjustingLocationId, setAdjustingLocationId] = useState<string | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("increase");
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calculate resulting quantity based on adjustment
  const calculateResultingQty = (currentQty: number, type: AdjustmentType, amount: string): number | null => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 0) {
      return null;
    }

    switch (type) {
      case "increase":
        return currentQty + amountNum;
      case "decrease":
        const result = currentQty - amountNum;
        return result >= 0 ? result : null;
      case "set":
        return amountNum;
    }
  };

  // Validate adjustment
  const validateAdjustment = (currentQty: number, type: AdjustmentType, amount: string): string | null => {
    if (!amount || amount.trim() === "") {
      return "Amount is required";
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      return "Amount must be a number";
    }

    if (amountNum < 0) {
      return "Amount must be positive";
    }

    if (type === "decrease") {
      const result = currentQty - amountNum;
      if (result < 0) {
        return "Cannot decrease below 0";
      }
    }

    if (type === "set" && amountNum < 0) {
      return "Quantity must be 0 or greater";
    }

    return null;
  };

  // Handle starting adjustment
  const handleStartAdjust = (locationId: string) => {
    setAdjustingLocationId(locationId);
    setAdjustmentType("increase");
    setAdjustmentAmount("");
    setValidationError(null);
  };

  // Handle canceling adjustment
  const handleCancelAdjust = () => {
    setAdjustingLocationId(null);
    setAdjustmentType("increase");
    setAdjustmentAmount("");
    setValidationError(null);
  };

  // Handle saving adjustment
  const handleSaveAdjust = (location: LocationRow) => {
    const error = validateAdjustment(location.qty, adjustmentType, adjustmentAmount);
    if (error) {
      setValidationError(error);
      return;
    }

    const resultingQty = calculateResultingQty(location.qty, adjustmentType, adjustmentAmount);
    if (resultingQty === null) {
      setValidationError("Invalid adjustment calculation");
      return;
    }

    if (onUpdateQuantity) {
      onUpdateQuantity(location.id, resultingQty);
    }

    // Reset state
    handleCancelAdjust();
  };

  // Get resulting quantity for preview
  const getResultingQty = (location: LocationRow): number | null => {
    if (adjustingLocationId !== location.id) return null;
    return calculateResultingQty(location.qty, adjustmentType, adjustmentAmount);
  };

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
              <th className="text-muted-foreground p-3 text-left text-xs font-medium tracking-wider uppercase">
                Reason
              </th>
              <th className="text-muted-foreground w-32 p-3 text-left text-xs font-medium tracking-wider uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {locations.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No locations added. Use the "Add Location" section above to add locations.
                </td>
              </tr>
            ) : (
              locations.map((loc) => {
                const isAdjusting = adjustingLocationId === loc.id;
                const resultingQty = getResultingQty(loc);

                return (
                  <React.Fragment key={loc.id}>
                    <tr className={`hover:bg-muted/50 transition-colors ${isAdjusting ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => onToggleSelect(loc.id)}
                          className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                          disabled={isAdjusting}
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
                      <td className="p-3 text-sm text-gray-900 dark:text-gray-100">
                        {onUpdateReasonCode ? (
                          <Select
                            value={loc.reason_code || DEFAULT_REASON_CODE}
                            onValueChange={(value) => {
                              onUpdateReasonCode(loc.id, value);
                            }}
                            disabled={isAdjusting}
                          >
                            <SelectTrigger className="h-8 w-full min-w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STOCK_ADJUSTMENT_REASON_CODES.map((code) => (
                                <SelectItem key={code.value} value={code.value}>
                                  {code.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span>{loc.reason_code || DEFAULT_REASON_CODE}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {!isAdjusting ? (
                            <>
                              {onUpdateQuantity && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleStartAdjust(loc.id)}
                                  disabled={adjustingLocationId !== null}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                                  title="Adjust quantity"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => onRemove(loc.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300"
                                title="Remove location"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSaveAdjust(loc)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300"
                                title="Save adjustment"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelAdjust}
                                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300"
                                title="Cancel adjustment"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isAdjusting && (
                      <tr>
                        <td colSpan={6} className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor={`adjust-type-${loc.id}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  Adjustment Type
                                </Label>
                                <Select
                                  value={adjustmentType}
                                  onValueChange={(value) => {
                                    setAdjustmentType(value as AdjustmentType);
                                    setValidationError(null);
                                  }}
                                >
                                  <SelectTrigger id={`adjust-type-${loc.id}`} className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="increase">Increase</SelectItem>
                                    <SelectItem value="decrease">Decrease</SelectItem>
                                    <SelectItem value="set">Set Exact</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor={`adjust-amount-${loc.id}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  Amount
                                </Label>
                                <Input
                                  id={`adjust-amount-${loc.id}`}
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={adjustmentAmount}
                                  onChange={(e) => {
                                    setAdjustmentAmount(e.target.value);
                                    setValidationError(null);
                                  }}
                                  className="mt-1"
                                  placeholder="Enter amount"
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  Resulting Quantity
                                </Label>
                                <div className="mt-1 px-3 py-2 rounded-md border bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {resultingQty !== null ? resultingQty : "-"}
                                </div>
                              </div>
                            </div>
                            {validationError && (
                              <div className="text-sm text-red-600 dark:text-red-400">{validationError}</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
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
                {locations.map((loc) => {
                  const isAdjusting = adjustingLocationId === loc.id;
                  const resultingQty = getResultingQty(loc);

                  return (
                    <div
                      key={loc.id}
                      className={`rounded-lg border p-4 transition-colors ${
                        isAdjusting
                          ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                          : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => onToggleSelect(loc.id)}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                            disabled={isAdjusting}
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
                        <div className="flex items-center gap-1">
                          {!isAdjusting ? (
                            <>
                              {onUpdateQuantity && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleStartAdjust(loc.id)}
                                  disabled={adjustingLocationId !== null}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                                  title="Adjust quantity"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => onRemove(loc.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300"
                                title="Remove location"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSaveAdjust(loc)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300"
                                title="Save adjustment"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelAdjust}
                                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300"
                                title="Cancel adjustment"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {!isAdjusting ? (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-600 dark:text-gray-300">Quantity:</span>
                            <span className="ml-1 font-bold text-gray-900 dark:text-gray-100">{loc.qty}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600 dark:text-gray-300">Reason:</span>
                            {onUpdateReasonCode ? (
                              <Select
                                value={loc.reason_code || DEFAULT_REASON_CODE}
                                onValueChange={(value) => {
                                  onUpdateReasonCode(loc.id, value);
                                }}
                                disabled={isAdjusting}
                              >
                                <SelectTrigger className="h-8 w-full mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STOCK_ADJUSTMENT_REASON_CODES.map((code) => (
                                    <SelectItem key={code.value} value={code.value}>
                                      {code.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="ml-1 text-gray-900 dark:text-gray-100">{loc.reason_code || DEFAULT_REASON_CODE}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <Label htmlFor={`adjust-type-mobile-${loc.id}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Adjustment Type
                              </Label>
                              <Select
                                value={adjustmentType}
                                onValueChange={(value) => {
                                  setAdjustmentType(value as AdjustmentType);
                                  setValidationError(null);
                                }}
                              >
                                <SelectTrigger id={`adjust-type-mobile-${loc.id}`} className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="increase">Increase</SelectItem>
                                  <SelectItem value="decrease">Decrease</SelectItem>
                                  <SelectItem value="set">Set Exact</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor={`adjust-amount-mobile-${loc.id}`} className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Amount
                              </Label>
                              <Input
                                id={`adjust-amount-mobile-${loc.id}`}
                                type="number"
                                min="0"
                                step="1"
                                value={adjustmentAmount}
                                onChange={(e) => {
                                  setAdjustmentAmount(e.target.value);
                                  setValidationError(null);
                                }}
                                className="mt-1"
                                placeholder="Enter amount"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Resulting Quantity
                              </Label>
                              <div className="mt-1 px-3 py-2 rounded-md border bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-gray-100">
                                {resultingQty !== null ? resultingQty : "-"}
                              </div>
                            </div>
                          </div>
                          {validationError && (
                            <div className="text-sm text-red-600 dark:text-red-400">{validationError}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

