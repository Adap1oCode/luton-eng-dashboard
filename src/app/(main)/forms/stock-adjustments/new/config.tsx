import { z } from "zod";

export const formSchema = z.object({
  tallyCardNumber: z.string().min(1, "Required"),
  itemNumber: z.string().min(1, "Required"),
  warehouse: z.string().min(1, "Required"),
  note: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  snapshotAt: z.date().optional(),
});

export const defaultValues = {
  tallyCardNumber: "",
  itemNumber: "",
  warehouse: "",
  note: "",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  snapshotAt: undefined,
};

export const warehouses = [
  { value: "RTZ", label: "RTZ Warehouse" },
  { value: "BDI", label: "BDI Warehouse" },
  { value: "CCW", label: "CCW Warehouse" },
];
