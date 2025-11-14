"use client";

import * as React from "react";
import { useState } from "react";
import { Search, ChevronDown, Check } from "lucide-react";

export type SearchableSelectOption = {
  id: string;
  label: string;
  // For two-column display
  itemNumber?: string;
  description?: string;
  // For warehouses
  code?: string;
  name?: string;
};

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  searchPlaceholder?: string;
  twoColumn?: boolean; // Enable two-column display (Item Number | Description or Code | Name)
  searchFields?: "label" | "both"; // Search only label or both itemNumber/description or code/name
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  className = "",
  searchPlaceholder = "Search...",
  twoColumn = false,
  searchFields = "label",
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Filter options based on the search term
  // If searchFields is "both", search in both itemNumber/description or code/name
  const filteredOptions = options.filter((option) => {
    const searchLower = searchTerm.toLowerCase();
    if (searchFields === "both") {
      if (option.itemNumber || option.description) {
        // For items: search item_number and description
        const itemNumMatch = option.itemNumber?.toLowerCase().includes(searchLower) ?? false;
        const descMatch = option.description?.toLowerCase().includes(searchLower) ?? false;
        return itemNumMatch || descMatch;
      } else if (option.code || option.name) {
        // For warehouses: search code and name
        const codeMatch = option.code?.toLowerCase().includes(searchLower) ?? false;
        const nameMatch = option.name?.toLowerCase().includes(searchLower) ?? false;
        return codeMatch || nameMatch;
      }
    }
    return option.label.toLowerCase().includes(searchLower);
  });

  // Find the currently selected option to display its label
  const selectedOption = options.find((option) => option.id === String(value ?? ""));

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = selectedOption
    ? twoColumn && (selectedOption.itemNumber || selectedOption.description)
      ? `${selectedOption.itemNumber || ""}${selectedOption.description ? ` - ${selectedOption.description}` : ""}`
      : twoColumn && (selectedOption.code || selectedOption.name)
      ? `${selectedOption.code || ""}${selectedOption.name ? ` - ${selectedOption.name}` : ""}`
      : selectedOption.label
    : placeholder;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-left focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        } ${className}`}
      >
        <span className={selectedOption ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}>
          {displayValue}
        </span>
      </button>
      <ChevronDown
        className={`pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-gray-400 transition-transform dark:text-gray-300 ${
          isOpen ? "rotate-180" : ""
        }`}
      />

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
          <div className="border-b border-gray-200 p-2 dark:border-gray-600">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-300" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-md border border-input bg-background py-2 pr-3 pl-9 text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none dark:bg-input/30"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {twoColumn && filteredOptions.length > 0 && (
              <div className="sticky top-0 z-10 grid grid-cols-2 gap-4 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {options[0]?.itemNumber !== undefined ? (
                  <>
                    <div>Item Number</div>
                    <div>Description</div>
                  </>
                ) : (
                  <>
                    <div>Code</div>
                    <div>Name</div>
                  </>
                )}
              </div>
            )}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${
                    option.id === String(value ?? "")
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-200"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {twoColumn && (option.itemNumber || option.description || option.code || option.name) ? (
                    <div className="grid grid-cols-2 gap-4 flex-1">
                      <div className="text-left">
                        {option.itemNumber ?? option.code ?? ""}
                      </div>
                      <div className="text-left">
                        {option.description ?? option.name ?? ""}
                      </div>
                    </div>
                  ) : (
                    <span>{option.label}</span>
                  )}
                  {option.id === String(value ?? "") && <Check className="h-4 w-4 ml-2 flex-shrink-0" />}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

