// src/app/(main)/dashboard/requisitions/types.ts

// Keep your existing types; below is a complete shape that matches your current UI,
// plus the small additions we need for Sites (Warehouse) and Customers (Project).

export type InventoryData = {
  available: number;
  onOrder: number;
  onPick: number;
  forecasted: number;
};

export type InventoryItem = {
  id: number;               // local numeric id for selection (keeps Set<number> working)
  type: "Inventory" | "Service";
  itemNo: string;
  description: string;
  requested: number;
  unit: string;
  picked: number;
  outstanding: number;
  salesPrice: number;
  lineTotal: number;
};

export type LightweightSite = {
  id: string;
  name?: string;
  description?: string;
  code?: string;
};

export type LightweightCustomer = {
  id: string;
  name?: string;
};

export type RequisitionFormState = {
  // Header
  orderDate: string;
  setOrderDate: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  warehouse: string;                // Warehouse (display string)
  setWarehouse: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  contractNumber: string;
  setContractNumber: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  po: string;
  setPo: (v: string) => void;

  // NEW: Project (Customers)
  project: string;
  setProject: (v: string) => void;

  // Toolbar/sections
  showFilter: boolean;
  setShowFilter: (v: boolean) => void;
  sendReceipt: boolean;
  setSendReceipt: (v: boolean) => void;
  printReport: boolean;
  setPrintReport: (v: boolean) => void;
  orderDetailsExpanded: boolean;
  setOrderDetailsExpanded: (v: boolean) => void;
  addItemExpanded: boolean;
  setAddItemExpanded: (v: boolean) => void;

  // Add Item
  itemNumber: string;
  setItemNumber: (v: string) => void;
  quantity: number;
  setQuantity: (v: number) => void;
  unit: string;
  setUnit: (v: string) => void;
  salesPrice: number;
  setSalesPrice: (v: number) => void;
  description: string;
  setDescription: (v: string) => void;
  altNumber: string;
  setAltNumber: (v: string) => void;
  inventoryData: InventoryData;

  // Items table
  inventoryItems: InventoryItem[];
  setInventoryItems: (rows: InventoryItem[]) => void;
  selectedItems: Set<number>;
  toggleItemSelection: (id: number) => void;
  toggleAllItems: () => void;

  // Utils
  calculateTotal: () => string;

  // NEW: Data lists for dropdowns (Warehouse = Sites, Project = Customers)
  sites: LightweightSite[];
  customers: LightweightCustomer[];
};
