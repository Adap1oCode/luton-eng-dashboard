// src/lib/data/providers/mock.ts

// ---- Import raw JSON produced from your Excel/CSV ----
import rawCategories from "@/data/mock/categories.json";
import rawCustomers from "@/data/mock/customers.json";
import rawItems from "@/data/mock/items.json";
import rawLocations from "@/data/mock/locations.json";
import rawRequisitionItems from "@/data/mock/requisition-items.json";
import rawRequisitions from "@/data/mock/requisitions.json";
import rawSites from "@/data/mock/sites.json";
import rawVendors from "@/data/mock/vendors.json";

import type { DataProvider } from "../provider";
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
} from "../types";

// ----------------- Helpers -----------------

// Excel serial date -> ISO string (defensive)
// - If it's already a string, just return the trimmed string (don't parse).
// - If it's a finite number, convert from Excel's epoch (allows fractional days).
// - Otherwise, return "" for bad/unknown values.
function excelToISO(v: unknown): string {
  if (v == null || v === "") return "";

  if (typeof v === "string") {
    return v.trim(); // e.g. "10/04/2025 20:36" -> keep as-is
  }

  if (typeof v === "number" && Number.isFinite(v)) {
    // Excel serial dates are days since 1899-12-30
    const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
    const ms = Math.round(v * 24 * 60 * 60 * 1000); // support fractional days
    const t = EXCEL_EPOCH_MS + ms;
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  }

  return "";
}

// Safe string getter (trimmed)
function s(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

// ✅ Safe number helper (prevents "Cannot find name 'n'" and NaN issues)
function n(v: unknown): number {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

// Build a stable id from any string-ish input (fallback to random if empty)
function makeId(...candidates: unknown[]): string {
  const first = candidates.find((x) => s(x).length > 0);
  return s(first) || cryptoRandom();
}

function cryptoRandom() {
  // Not cryptographically secure in all envs, but fine for mock ids.
  return "id_" + Math.random().toString(36).slice(2, 10);
}

// Pagination helper
function paginate<T>(arr: T[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  return {
    data: arr.slice(start, start + pageSize),
    total: arr.length,
  };
}

// ----------------- Canonical Mappers -----------------

// Sites (a.k.a. Warehouses list in your UI)
// REPLACE your mapSites with this:
function mapSites(rows: any[]): any[] {
  return rows.map((r) => {
    const warehouse = s(r["Warehouse"]); // e.g. "AM - WH 1", "CC - WH 1"
    return {
      id: makeId(warehouse),
      code: warehouse, // keep code = Warehouse (handy short label)
      description: warehouse, // drive dropdown display via 'description'
    };
  });
}

// Customers (Project = Customers)
function mapCustomers(rows: any[]): any[] {
  return rows.map((r) => {
    const projNum = s(r["Project Number"]); // e.g. "ECG/SBU/ASN/NP/SUBT-19/04"
    return {
      id: makeId(projNum),
      name: projNum, // drives dropdown text
      email: s(r["Business Email"]) || s(r["Contact Email"]),
      phone: s(r["Business Phone"]) || s(r["Contact Phone"]),
    };
  });
}

// Vendors
function mapVendors(rows: any[]): any[] {
  // Seen fields: "Vendor Name", "Vendor Number"
  return rows.map((r) => ({
    id: makeId(r["Vendor Number"], r["Vendor Name"]),
    name: s(r["Vendor Name"]) || s(r["Vendor Number"]),
    email: s(r["Contact Email"]) || s(r["Email"]),
    phone: s(r["Contact Phone"]) || s(r["Phone"]),
  }));
}

// Categories
function mapCategories(rows: any[]): any[] {
  // Seen field: "Category Name"
  return rows.map((r) => {
    const name = s(r["Category Name"]) || s(r["Name"]);
    return {
      id: name.toLowerCase().replace(/\s+/g, "-") || makeId(name),
      name,
    };
  });
}

// Locations (bin locations under a site/warehouse)
function mapLocations(rows: any[]): any[] {
  // Seen fields: "Warehouse", "Location", "Location Description"
  return rows.map((r) => ({
    id: makeId(r["Location"]),
    code: s(r["Location"]),
    description: s(r["Location Description"]) || s(r["Description"]),
    siteId: makeId(r["Warehouse"]), // relate to site by warehouse name/id
  }));
}

// Warehouses (your UI equates these to Sites; so we map Sites -> Warehouse shape)
function mapWarehousesFromSites(sites: any[]): Warehouse[] {
  return sites.map((s) => ({
    id: s.id,
    code: s.code || s.id,
    name: s.description || s.code || s.id,
    is_active: true,
    created_at: null,
    updated_at: null,
  }));
}

// Requisitions
function mapRequisitions(rows: any[]): any[] {
  // Seen fields: "Requisition Order / Transfer Req. Order", "Warehouse", "Status",
  // "Order Date", "Due Date", "Reference Number", "Project Number", "Notes", "PO#",
  // plus totals ("Items Total", "Shipping Cost", "Tax", "Grand Total") which we ignore for now.
  return rows.map((r) => {
    const code = s(r["Requisition Order / Transfer Req. Order"]) || s(r["Reference Number"]);
    const warehouseName = s(r["Warehouse"]);
    const req: any = {
      id: makeId(code),
      code,
      project: s(r["Project Number"]) || s(r["Client Name"]) || "",
      warehouseId: makeId(warehouseName),
      orderDate: excelToISO(r["Order Date"]),
      dueDate: excelToISO(r["Due Date"]),
      email: "", // not present in the sheet
      contractNumber: "", // not present or varies
      notes: s(r["Notes"]),
      po: s(r["PO#"]),
      items: [], // you can enrich later by joining on another dataset if desired
    };
    return req;
  });
}

// Items
function mapItems(rows: any[]): any[] {
  // Try to be flexible with column names coming from CSV/Excel
  return rows.map((r) => {
    const itemNo = s(r["Item No"]) || s(r["Item Number"]) || s(r["itemNo"]) || s(r["SKU"]) || s(r["Code"]);
    const description = s(r["Description"]) || s(r["Item Description"]) || s(r["Name"]);
    const unit = s(r["Unit"]) || s(r["UOM"]) || "Ea";
    // price might be "Sales Price" / "Unit Price" / "Price"
    const priceStr = s(r["Sales Price"]) || s(r["Unit Price"]) || s(r["Price"]) || s(r["salesPrice"]);
    const price = Number(priceStr.replace(/[^0-9.-]/g, "")) || 0;

    // Optional stock fields if present
    const available = Number(s(r["Available"])) || 0;
    const onOrder = Number(s(r["On Order"])) || 0;
    const onPick = Number(s(r["On Pick"])) || 0;
    const forecasted = Number(s(r["Forecasted"])) || available + onOrder - onPick;

    return {
      id: makeId(itemNo, description),
      type: "INV" as const, // default; change to "SRV" if you have a column indicating service
      itemNo,
      altNo: s(r["Alt No"]) || s(r["Alternate"]) || undefined,
      description,
      unit,
      salesPrice: price,
      stock: { available, onOrder, onPick, forecasted },
      requested: 0,
      picked: 0,
      outstanding: 0,
      lineTotal: 0,
    };
  });
}

// 🔹 NEW: Requisition Items (TABLE rows) — from inventory-items.json
function mapRequisitionItems(rows: any[]): any[] {
  return rows.map((r: any) => {
    const itemNo = s(r.itemNo) || s(r["Item Number"]) || s(r["Item No"]) || s(r.SKU) || s(r.Code);
    const description = s(r.description) || s(r["Description"]) || s(r["Item Description"]) || s(r.Name);
    const unit = s(r.unit) || s(r["Unit of Measure"]) || s(r.Unit) || s(r.UOM) || "Ea";

    const priceRaw =
      r.salesPrice ?? r["Item Sale Price"] ?? r["Sales Price"] ?? r["Unit Price"] ?? r.Price ?? r["Item Cost"] ?? 0;
    const salesPrice = typeof priceRaw === "string" ? n(priceRaw.replace(/[^0-9.-]/g, "")) : n(priceRaw);

    const requested = n(r.requested ?? 0);
    const picked = n(r.picked ?? 0);
    const outstanding = n(r.outstanding ?? requested - picked);
    const lineTotal = n(r.lineTotal ?? requested * salesPrice);

    const available = n(r["_available"] ?? r["Total Available"] ?? r["Available"]);
    const onOrder = n(r["On Order"]);
    const onPick = n(r["On Pick"]);
    const forecasted = n(r["Forecasted"] ?? available + onOrder - onPick);

    return {
      lineId: String(r.id ?? `${itemNo}:${description}:${Math.random().toString(36).slice(2, 8)}`),
      itemId: makeId(itemNo),
      itemNo,
      description,
      unit,
      salesPrice,
      requested,
      picked,
      outstanding,
      lineTotal,
      stock: { available, onOrder, onPick, forecasted },
    };
  });
}

// ----------------- Materialize canonical datasets -----------------

const SITES: any[] = mapSites(rawSites as any[]);
const CUSTOMERS: any[] = mapCustomers(rawCustomers as any[]);
const VENDORS: any[] = mapVendors(rawVendors as any[]);
const CATEGORIES: any[] = mapCategories(rawCategories as any[]);
const LOCATIONS: any[] = mapLocations(rawLocations as any[]);
const ITEMS: any[] = mapItems(rawItems as any[]);
const REQUISITION_ITEMS: any[] = mapRequisitionItems(rawRequisitionItems as any[]); // ✅ new table rows
const REQUISITIONS: any[] = mapRequisitions(rawRequisitions as any[]);
const WAREHOUSES: Warehouse[] = mapWarehousesFromSites(SITES);

// ----------------- Provider -----------------

export const mockProvider: DataProvider = {
  // Requisitions
  async getRequisition(id) {
    return REQUISITIONS.find((r) => r.id === id) ?? null;
  },
  async listRequisitions({ page = 1, pageSize = 20 } = {}) {
    return paginate(REQUISITIONS, page, pageSize);
  },

  // Items
  async listItems({ q, page = 1, pageSize = 50 } = {}) {
    let data = ITEMS;
    if (q) {
      const ql = q.toLowerCase();
      data = data.filter((i) => i.itemNo.toLowerCase().includes(ql) || i.description.toLowerCase().includes(ql));
    }
    return paginate(data, page, pageSize);
  },
  async getItemByNumber(itemNo) {
    return ITEMS.find((i) => i.itemNo === itemNo) ?? null;
  },

  // 🔹 Requisition Items (table rows)
  async listRequisitionItems({ requisitionId, page = 1, pageSize = 50 } = {}) {
    // mock file does not carry requisitionId; return all
    const data = REQUISITION_ITEMS;
    return paginate(data, page, pageSize);
  },

  // Warehouses (mapped from Sites) — alpha asc by display text
  async listWarehouses() {
    // if you're returning Warehouse[], keep sorting by its .name or fallback
    // but since we build Warehouse[] from Sites, ensure that name is derived from description/code:
    const arr = WAREHOUSES.slice().sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    return arr;
  },

  // Sites (if you also expose listSites anywhere) — alpha asc by description/code
  async listSites() {
    return SITES.slice().sort((a, b) => (a.description ?? a.code ?? "").localeCompare(b.description ?? b.code ?? ""));
  },

  // Customers (Projects) — dedupe by 'name' (Site) and sort alpha asc
  async listCustomers({ page = 1, pageSize = 50 } = {}) {
    const byName = new Map<string, any>();
    for (const c of CUSTOMERS) {
      const key = (c.name ?? "").toLowerCase();
      if (key && !byName.has(key)) byName.set(key, c);
    }
    const arr = Array.from(byName.values());
    arr.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

    const start = (page - 1) * pageSize;
    return { data: arr.slice(start, start + pageSize), total: arr.length };
  },

  // Vendors
  async listVendors({ page = 1, pageSize = 50 } = {}) {
    return paginate(VENDORS, page, pageSize);
  },

  // Categories
  async listCategories() {
    return CATEGORIES;
  },

  // Locations
  async listLocations({ page = 1, pageSize = 50 } = {}) {
    return paginate(LOCATIONS, page, pageSize);
  },
};
