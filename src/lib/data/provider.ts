import type {
  Warehouse,
  Item,
  Requisition,
  Customer,
  Vendor,
  Category,
  Location,
  Site,
  RequisitionItem,
} from "./types";

export interface DataProvider {
  // Requisitions
  getRequisition(id: string): Promise<Requisition | null>;
  listRequisitions(opts?: { page?: number; pageSize?: number }): Promise<{ data: Requisition[]; total: number }>;

  // Catalog Items (stock master)
  listItems(opts?: { q?: string; page?: number; pageSize?: number }): Promise<{ data: Item[]; total: number }>;
  getItemByNumber(itemNo: string): Promise<Item | null>;

  // Requisition Items (table rows)
  listRequisitionItems(opts?: {
    requisitionId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: RequisitionItem[]; total: number }>;

  // Warehouses
  listWarehouses(): Promise<Warehouse[]>;

  // Customers
  listCustomers(opts?: { page?: number; pageSize?: number }): Promise<{ data: Customer[]; total: number }>;

  // Vendors
  listVendors(opts?: { page?: number; pageSize?: number }): Promise<{ data: Vendor[]; total: number }>;

  // Categories
  listCategories(): Promise<Category[]>;

  // Locations
  listLocations(opts?: { page?: number; pageSize?: number }): Promise<{ data: Location[]; total: number }>;

  // Sites
  listSites(): Promise<Site[]>;
}
