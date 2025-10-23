import type {
  Warehouse,
  // Item, // Item type not found, using any for now
  // Requisition, // Requisition type not found, using any for now
  // Customer, // Customer type not found, using any for now
  // Vendor, // Vendor type not found, using any for now
  // Category, // Category type not found, using any for now
  // Location, // Location type not found, using any for now
  // Site, // Site type not found, using any for now
  // RequisitionItem, // RequisitionItem type not found, using any for now
} from "./types";

export interface DataProvider {
  // Requisitions
  getRequisition(id: string): Promise<any | null>;
  listRequisitions(opts?: { page?: number; pageSize?: number }): Promise<{ data: any[]; total: number }>;

  // Catalog Items (stock master)
  listItems(opts?: { q?: string; page?: number; pageSize?: number }): Promise<{ data: any[]; total: number }>;
  getItemByNumber(itemNo: string): Promise<any | null>;

  // Requisition Items (table rows)
  listRequisitionItems(opts?: {
    requisitionId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: any[]; total: number }>;

  // Warehouses
  listWarehouses(): Promise<Warehouse[]>;

  // Customers
  listCustomers(opts?: { page?: number; pageSize?: number }): Promise<{ data: any[]; total: number }>;

  // Vendors
  listVendors(opts?: { page?: number; pageSize?: number }): Promise<{ data: any[]; total: number }>;

  // Categories
  listCategories(): Promise<any[]>;

  // Locations
  listLocations(opts?: { page?: number; pageSize?: number }): Promise<{ data: any[]; total: number }>;

  // Sites
  listSites(): Promise<any[]>;
}
