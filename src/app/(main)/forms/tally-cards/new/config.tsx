import { z } from "zod";

export const formSchema = z.object({
  cardUid: z.string().min(1, "Card UID is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  itemNumber: z.string().min(1, "Item number is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  status: z.enum(["draft", "active", "completed"]).default("draft"),
  owner: z.string().min(1, "Owner is required"),
  notes: z.string().optional(),
});

export const defaultValues = {
  cardUid: "",
  warehouseId: "",
  itemNumber: "",
  quantity: 1,
  status: "draft" as const,
  owner: "",
  notes: "",
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
    // Fallback to static warehouse names (labels only; values are non-UUID)
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

export const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];
