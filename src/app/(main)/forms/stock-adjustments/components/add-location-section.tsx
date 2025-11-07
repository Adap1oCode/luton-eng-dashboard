"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { LocationRow } from "./locations-table";

type Props = {
  onAdd: (location: string, qty: number) => void;
  expanded?: boolean;
};

export default function AddLocationSection({ onAdd, expanded: initialExpanded = true }: Props) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [location, setLocation] = useState("");
  const [qty, setQty] = useState<number | "">("");

  const handleAdd = () => {
    if (!location.trim()) {
      alert("Location is required");
      return;
    }
    if (qty === "" || qty === 0) {
      alert("Quantity is required and must not be zero");
      return;
    }
    onAdd(location.trim(), Number(qty));
    setLocation("");
    setQty("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission
      e.stopPropagation(); // Stop event bubbling
      handleAdd();
    }
  };

  return (
    <div className="mb-6 rounded-lg bg-white shadow-sm dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Location</h3>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
        >
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {expanded && (
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left Column - Editable Form */}
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Location <span className="text-red-600">*</span>
                </label>
                <Input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Rack / Aisle / Bin"
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Quantity <span className="text-red-600">*</span>
                </label>
                <Input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
                  onKeyPress={handleKeyPress}
                  placeholder="e.g. -4 or 12"
                  className="w-full"
                />
              </div>

              <Button 
                type="button" 
                onClick={handleAdd} 
                className="w-full sm:w-auto"
              >
                Add Location
              </Button>
            </div>

            {/* Right Column - Info/Help */}
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/30">
                <h4 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-100">Instructions</h4>
                <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
                  <li>• Enter location (e.g., "A-1-B", "Rack 5")</li>
                  <li>• Enter quantity (positive or negative)</li>
                  <li>• Click "Add Location" or press Enter</li>
                  <li>• Total quantity is computed automatically</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

