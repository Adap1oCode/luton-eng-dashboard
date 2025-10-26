"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dataProvider } from "@/lib/data";
// import type { Item } from "@/lib/data/types"; // Item type not found, using any for now
type Item = any; // TODO: Define proper Item type

import type { RequisitionFormState } from "./types";

type Props = { form: RequisitionFormState };

export default function AddItemSection({ form }: Props) {
  const {
    addItemExpanded,
    setAddItemExpanded,
    itemNumber,
    setItemNumber,
    quantity,
    setQuantity,
    unit,
    setUnit,
    salesPrice,
    setSalesPrice,
    description,
    altNumber,
    inventoryData,
    calculateTotal,
  } = form;

  // ---- Local state for item lookup (mock data) ----
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Selected item description for preview (form has no setDescription)
  const [selectedDesc, setSelectedDesc] = useState<string>("");

  // Computed "Available" across all mock rows for the selected item number
  const [computedAvailable, setComputedAvailable] = useState<number | null>(null);

  // Load items from mock provider (no search; take first page)
  useEffect(() => {
    let ignore = false;
    const run = async () => {
      setLoading(true);
      try {
        const { data, total } = await dataProvider.listItems({ page: 1, pageSize: 50 });
        if (!ignore) {
          setItems(data);
          setTotal(total);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, []);

  // Helper: numeric coercion safe for unknown shapes
  const toNum = (v: unknown): number => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  // When itemNumber changes:
  //  - hydrate unit & sales price from selected item
  //  - compute aggregated "Available" across all rows for that item
  useEffect(() => {
    let ignore = false;

    const hydrateDetails = async () => {
      // reset computed available when nothing is selected
      if (!itemNumber) {
        setSelectedDesc("");
        setComputedAvailable(null);
        return;
      }

      // 1) Get canonical item (for unit + default sales price + description)
      const item = await dataProvider.getItemByNumber(itemNumber);
      if (!ignore) {
        if (item) {
          if (item.unit && item.unit !== unit) setUnit(item.unit);
          if (typeof item.salesPrice === "number" && item.salesPrice !== salesPrice) {
            setSalesPrice(item.salesPrice);
          }
          setSelectedDesc(item.description || "");
        } else {
          setSelectedDesc("");
        }
      }

      // 2) Aggregate "Available" across all rows with this exact item number (mock data)
      //    We fetch a wider list and filter exact matches to be robust to providers that return subsets.
      //    If your provider exposes a dedicated "by item number" list, swap it in here.
      const page1 = await dataProvider.listItems({ q: itemNumber, page: 1, pageSize: 500 });
      const matches = page1.data.filter((row: any) => {
        // exact match against itemNo or CSV-style "Item Number"
        return row?.itemNo === itemNumber || row?.["Item Number"] === itemNumber;
      });

      // Sum using either camelCase "totalAvailable" or CSV "Total Available"
      const sum = matches.reduce((acc: number, row: any) => {
        const v = row?.totalAvailable ?? row?.["Total Available"];
        return acc + toNum(v);
      }, 0);

      if (!ignore) setComputedAvailable(Number.isFinite(sum) ? sum : 0);
    };

    hydrateDetails();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemNumber]);

  const optionLabel = (i: Item) => `${i.itemNo} — ${i.description || "No description"}`;

  return (
    <div className="mb-6 rounded-lg bg-white shadow-sm dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Item</h3>
        <button
          onClick={() => setAddItemExpanded(!addItemExpanded)}
          className="p-1 text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
        >
          {addItemExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {addItemExpanded && (
        <div className="p-6">
          <div className="mb-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Left Column - Editable Form */}
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Item Number
                </label>

                <div className="relative">
                  <select
                    value={itemNumber || ""}
                    onChange={(e) => setItemNumber(e.target.value)}
                    disabled={loading}
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                  >
                    <option value="" disabled>
                      {loading ? "Loading items..." : "Select an item"}
                    </option>
                    {items.map((i) => (
                      <option key={i.id} value={i.itemNo}>
                        {optionLabel(i)}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                  {selectedDesc
                    ? selectedDesc
                    : itemNumber
                    ? "No description found for this item."
                    : `Showing ${Math.min(items.length, 50)} of ${total} items`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value || 0))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Unit
                  </label>
                  <div className="relative">
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                    >
                      <option value="Ea">Ea</option>
                      <option value="Kg">Kg</option>
                      <option value="Lt">Lt</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Sales Price
                </label>
                <div className="flex">
                  <input
                    type="number"
                    step="0.01"
                    value={salesPrice}
                    onChange={(e) => setSalesPrice(Number(e.target.value || 0))}
                    className="flex-1 rounded-l-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                  />
                  <span className="flex items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    / {unit}
                  </span>
                  <button className="ml-2 px-3 py-2 text-sm text-blue-600 underline hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200">
                    View Price Tiers
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Total</label>
                <input
                  type="text"
                  value={calculateTotal()}
                  className="border-input bg-muted text-muted-foreground w-full rounded-lg border px-3 py-2"
                  readOnly
                />
              </div>

              <Button className="w-full sm:w-auto">Add</Button>
            </div>

            {/* Right Column - Read-only info */}
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">ALT Number</label>
                <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {altNumber || "-"}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
                <div className="min-h-[96px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                  {selectedDesc || description}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  (Unit - {unit})
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    // Use computedAvailable when present; otherwise fall back to form.inventoryData
                    { label: "Available", value: computedAvailable ?? inventoryData.available },
                    { label: "On Order", value: inventoryData.onOrder },
                    { label: "On Pick", value: inventoryData.onPick },
                    { label: "Forecasted", value: inventoryData.forecasted },
                  ].map((m) => (
                    <div key={m.label} className="text-center">
                      <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">{m.label}</div>
                      <div className="rounded border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-700">
                        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{m.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* End Right Column */}
          </div>
        </div>
      )}
    </div>
  );
}
