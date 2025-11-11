// -----------------------------------------------------------------------------
// FILE: src/components/dialogs/configs/inventory-info.config.ts
// TYPE: Inventory dialog configuration
// PURPOSE: Declarative definition of field layout and presentation rules
// -----------------------------------------------------------------------------

import type { ReactNode } from "react";

export type InventoryInfoSnapshot = {
  item_number: number | null;
  description: string | null;
  category: string | null;
  unit_of_measure: string | null;
  total_available: number | null;
  item_cost: number | null;
  on_order: number | null;
  committed: number | null;
};

export type MetricAccent = "green" | "blue" | "orange" | "purple";

export type InventoryInfoFieldConfig = {
  key: keyof InventoryInfoSnapshot;
  label: string;
  type?: "text" | "metric" | "currency" | "code";
  accent?: MetricAccent;
  /** Optional custom formatter. Defaults handled by dialog renderer. */
  format?: (
    value: InventoryInfoSnapshot[keyof InventoryInfoSnapshot],
    snapshot: InventoryInfoSnapshot | null
  ) => ReactNode;
};

export type InventoryInfoSectionConfig =
  | {
      kind: "prominent";
      field: InventoryInfoFieldConfig;
    }
  | {
      kind: "block";
      field: InventoryInfoFieldConfig;
    }
  | {
      kind: "grid";
      columns?: number;
      fields: InventoryInfoFieldConfig[];
    };

export const inventoryInfoSections: InventoryInfoSectionConfig[] = [
  {
    kind: "prominent",
    field: { key: "item_number", label: "Item Number", type: "code" },
  },
  {
    kind: "block",
    field: { key: "description", label: "Description", type: "text" },
  },
  {
    kind: "grid",
    columns: 2,
    fields: [
      { key: "category", label: "Category" },
      { key: "unit_of_measure", label: "Unit of Measure" },
      { key: "total_available", label: "Total Available", type: "metric", accent: "green" },
      { key: "item_cost", label: "Item Cost", type: "currency", accent: "blue" },
      { key: "on_order", label: "On Order", type: "metric", accent: "orange" },
      { key: "committed", label: "Committed", type: "metric", accent: "purple" },
    ],
  },
];
