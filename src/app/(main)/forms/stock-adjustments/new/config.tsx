import { z } from "zod";

export const formSchema = z.object({
  adjustmentId: z.string().min(1, "Adjustment ID is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  itemNumber: z.string().min(1, "Item number is required"),
  currentQuantity: z.number().min(0, "Current quantity must be at least 0"),
  adjustedQuantity: z.number().min(0, "Adjusted quantity must be at least 0"),
  adjustmentType: z.enum(["increase", "decrease", "correction"]).default("correction"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
  status: z.enum(["draft", "pending", "approved", "rejected"]).default("draft"),
  owner: z.string().min(1, "Owner is required"),
});

export const defaultValues = {
  adjustmentId: "",
  warehouseId: "",
  itemNumber: "",
  currentQuantity: 0,
  adjustedQuantity: 0,
  adjustmentType: "correction" as const,
  reason: "",
  notes: "",
  status: "draft" as const,
  owner: "",
};

// Fetch warehouses from API
export async function fetchWarehouses() {
  try {
    const response = await fetch("/api/warehouses");
    if (!response.ok) {
      throw new Error("Failed to fetch warehouses");
    }
    const data = await response.json();
    return data.map((warehouse: any) => ({
      value: warehouse.id,
      label: warehouse.name || warehouse.code,
    }));
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    // Fallback to static warehouse names
    return [
      { value: "BP - WH 1", label: "BP - WH 1" },
      { value: "BP - WH 2", label: "BP - WH 2" },
      { value: "BDI - WH 1", label: "BDI - WH 1" },
      { value: "AMC - WH 2", label: "AMC - WH 2" },
      { value: "RTZ - WH 1", label: "RTZ - WH 1" },
      { value: "CC - WH 1", label: "CC - WH 1" },
    ];
  }
}

export const warehouses = [
  { value: "BP - WH 1", label: "BP - WH 1" },
  { value: "BP - WH 2", label: "BP - WH 2" },
  { value: "BDI - WH 1", label: "BDI - WH 1" },
  { value: "AMC - WH 2", label: "AMC - WH 2" },
  { value: "RTZ - WH 1", label: "RTZ - WH 1" },
  { value: "CC - WH 1", label: "CC - WH 1" },
];

export const adjustmentTypeOptions = [
  { value: "increase", label: "Increase" },
  { value: "decrease", label: "Decrease" },
  { value: "correction", label: "Correction" },
];

export const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const reasonOptions = [
  { value: "damaged", label: "Damaged Items" },
  { value: "expired", label: "Expired Items" },
  { value: "lost", label: "Lost Items" },
  { value: "found", label: "Found Items" },
  { value: "recount", label: "Physical Recount" },
  { value: "system_error", label: "System Error" },
  { value: "other", label: "Other" },
];
