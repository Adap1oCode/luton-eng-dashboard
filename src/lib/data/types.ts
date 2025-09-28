export type Warehouse = {
  id: string;
  name: string;
  short: string;
};

export type Item = {
  id: string;
  type: "INV" | "SRV";
  itemNo: string;
  altNo?: string;
  description: string;
  unit: string;
  salesPrice: number;
  requested?: number;
  picked?: number;
  outstanding?: number;
  lineTotal?: number;
  stock?: {
    available: number;
    onOrder: number;
    onPick: number;
    forecasted: number;
  };
};

/** A single row used in the Items table (transactional snapshot). */
export type RequisitionItem = {
  lineId: string;
  itemId: string;
  itemNo: string;
  description: string;
  unit: string;
  salesPrice: number;
  requested: number;
  picked: number;
  outstanding: number;
  lineTotal: number;
  stock?: Item["stock"];
};

export type Requisition = {
  id: string;
  code: string;
  project: string;
  warehouseId: string;
  orderDate: string;
  dueDate: string;
  email: string;
  contractNumber?: string;
  notes?: string;
  po?: string;
  items: Item[];
};

export type Customer = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
};

export type Vendor = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
};

export type Category = {
  id: string;
  name: string;
};

export type Location = {
  id: string;
  code: string;
  description: string;
  siteId: string;
};

export type Site = {
  id: string;
  code: string;
  description: string;
};
