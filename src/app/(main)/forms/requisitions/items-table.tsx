"use client";

import React from "react";

import { Filter, CheckSquare, Square } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { RequisitionFormState } from "./types";

type Props = { form: RequisitionFormState };

export default function ItemsTable({ form }: Props) {
  const { showFilter, setShowFilter, selectedItems, toggleAllItems, toggleItemSelection, inventoryItems } = form;

  return (
    <div className="mb-6 rounded-lg bg-white shadow-sm dark:bg-gray-800">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setShowFilter(!showFilter)} variant="ghost" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Show Filter
          </Button>
          <Button variant="destructive" className="hover:bg-destructive/90">
            Remove
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
                  variant="ghost"
                  size="icon"
                  onClick={toggleAllItems}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {selectedItems.size === inventoryItems.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              </th>
              {[
                "Type",
                "Item No.",
                "Description",
                "Requested",
                "Unit",
                "Picked",
                "Outstanding",
                "Sales Price",
                "Line Total",
              ].map((h) => (
                <th
                  key={h}
                  className="text-muted-foreground p-3 text-left text-xs font-medium tracking-wider uppercase"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {inventoryItems.map((item) => (
              <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                <td className="p-3">
                  <button
                    onClick={() => toggleItemSelection(item.id)}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                  >
                    {selectedItems.has(item.id) ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </td>
                <td className="p-3 text-sm text-gray-900 dark:text-gray-100">{item.type}</td>
                <td className="p-3">
                  <div className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                    {item.itemNo}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">INV</div>
                </td>
                <td className="p-3 text-sm text-gray-900 dark:text-gray-100">{item.description}</td>
                <td className="p-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.requested}</td>
                <td className="p-3 text-sm text-gray-900 dark:text-gray-100">{item.unit}</td>
                <td className="p-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.picked}</td>
                <td className="p-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.outstanding}</td>
                <td className="p-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.salesPrice}</td>
                <td className="p-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.lineTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden">
        <div className="p-4">
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={toggleAllItems}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
            >
              {selectedItems.size === inventoryItems.length ? (
                <CheckSquare className="h-5 w-5" />
              ) : (
                <Square className="h-5 w-5" />
              )}
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Select All Items</span>
          </div>

          <div className="space-y-4">
            {inventoryItems.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleItemSelection(item.id)}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                    >
                      {selectedItems.has(item.id) ? (
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                    <div>
                      <div className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                        {item.itemNo}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.type} - INV</div>
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <h4 className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">Description</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{item.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">Requested:</span>
                    <span className="ml-1 font-bold text-gray-900 dark:text-gray-100">
                      {item.requested} {item.unit}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">Picked:</span>
                    <span className="ml-1 font-bold text-gray-900 dark:text-gray-100">
                      {item.picked} {item.unit}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">Outstanding:</span>
                    <span className="ml-1 font-bold text-gray-900 dark:text-gray-100">
                      {item.outstanding} {item.unit}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-300">Total:</span>
                    <span className="ml-1 font-bold text-gray-900 dark:text-gray-100">{item.lineTotal}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
