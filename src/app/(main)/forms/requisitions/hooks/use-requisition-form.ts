"use client";

import { useState, useCallback, useEffect } from "react";
import { dataProvider } from "@/lib/data"; // Sites/Customers from mock provider
import type { Site, Customer } from "@/lib/data/types";
import type { RequisitionFormState, InventoryItem, InventoryData } from "../types";

export function useRequisitionForm(): RequisitionFormState {
  // ---------------------------
  // Header (existing local state)
  // ---------------------------
  const [orderDate, setOrderDate] = useState("10/04/2025 20:36");
  const [dueDate, setDueDate] = useState("18/04/2025 20:00");
  const [warehouse, setWarehouse] = useState("AM - WH 1"); // Warehouse = Sites (we'll hydrate this)
  const [project, setProject] = useState<string>("");       // NEW: Project = Customers (dropdown)
  const [email, setEmail] = useState("");
  const [contractNumber, setContractNumber] = useState("SALTPOND TOWERLINE");
  const [notes, setNotes] = useState("");
  const [po, setPo] = useState("");

  const [showFilter, setShowFilter] = useState(false);
  const [sendReceipt, setSendReceipt] = useState(false);
  const [printReport, setPrintReport] = useState(false);
  const [orderDetailsExpanded, setOrderDetailsExpanded] = useState(true);
  const [addItemExpanded, setAddItemExpanded] = useState(false);

  // ---------------------------
  // Add Item (existing local state)
  // ---------------------------
  const [itemNumber, setItemNumber] = useState("1");
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState("Ea");
  const [salesPrice, setSalesPrice] = useState(0.0);
  const [description, setDescription] = useState("SINGLE SEAT RECEPTION");
  const [altNumber, setAltNumber] = useState("");

  const inventoryData: InventoryData = {
    available: 38,
    onOrder: 0,
    onPick: 0,
    forecasted: 38,
  };

  // ---------------------------
  // Remote-backed data (NEW)
  // ---------------------------
  const [sites, setSites] = useState<Site[]>([]);             // drives Warehouse dropdown
  const [customers, setCustomers] = useState<Customer[]>([]); // drives Project dropdown
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]); // feeds ItemsTable

  // Selection (unchanged)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // ---------------------------
  // Effects: hydrate lists + table from mock provider
  // ---------------------------
  useEffect(() => {
    let cancelled = false;

    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    (async () => {
      // Load Sites, Customers, and Requisition Items (table rows) from the provider
      const [sitesData, customersPage, reqItemsPage] = await Promise.all([
        dataProvider.listSites(),
        dataProvider.listCustomers({ page: 1, pageSize: 1000 }),
        dataProvider.listRequisitionItems({ page: 1, pageSize: 500 }),
      ]);
      if (cancelled) return;

      setSites(sitesData);
      setCustomers(customersPage.data);

      // Default Warehouse to first Site (prefer a nice display prop)
      if (sitesData.length && (!warehouse || warehouse === "AM - WH 1")) {
        const s: any = sitesData[0];
        const display = s.name ?? s.description ?? s.code ?? s.id;
        setWarehouse(String(display));
      }

      // Default Project to first Customer
      if (customersPage.data.length && !project) {
        const c = customersPage.data[0];
        setProject(c.name ?? c.id);
      }

      // Map Requisition Items (provider) -> ItemsTable rows
      const items: InventoryItem[] = reqItemsPage.data.map((r: any, idx: number) => {
        const requested = toNum(r.requested ?? 1);
        const picked = toNum(r.picked ?? 0);
        const outstanding = toNum(r.outstanding ?? (requested - picked));
        const price = typeof r.salesPrice === "number" ? r.salesPrice : toNum(r.salesPrice);
        const total = r.lineTotal != null ? toNum(r.lineTotal) : requested * (Number.isFinite(price) ? price : 0);

        return {
          id: toNum(r.id) || idx + 1, // table expects numeric id
          type: (r.type ?? "Inventory") as "Inventory" | "Service",
          itemNo: String(r.itemNo ?? r["Item Number"] ?? ""),
          description: r.description ?? r["Description"] ?? "",
          requested,
          unit: r.unit ?? r["Unit of Measure"] ?? "Ea",
          picked,
          outstanding,
          salesPrice: price,
          lineTotal: Number.isFinite(total) ? Number(total.toFixed(2)) : 0,
        } as InventoryItem;
      });

      setInventoryItems(items);
    })().catch((err) => {
      // keep silent in UI; log for dev
      console.error("Hydration error (useRequisitionForm):", err);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // ---------------------------
  // Existing helpers (unchanged)
  // ---------------------------
  const toggleItemSelection = useCallback((id: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllItems = useCallback(() => {
    setSelectedItems((prev) => {
      if (prev.size === inventoryItems.length) return new Set();
      return new Set(inventoryItems.map((i) => i.id));
    });
  }, [inventoryItems]);

  const calculateTotal = useCallback(() => (quantity * salesPrice).toFixed(2), [quantity, salesPrice]);

  // ---------------------------
  // Return shape (existing + NEW fields)
  // ---------------------------
  return {
    // Header
    orderDate,
    setOrderDate,
    dueDate,
    setDueDate,
    warehouse,
    setWarehouse,
    email,
    setEmail,
    contractNumber,
    setContractNumber,
    notes,
    setNotes,
    po,
    setPo,

    // NEW: Project & data lists for dropdowns
    project,
    setProject,
    sites,
    customers,

    // Toolbar/sections
    showFilter,
    setShowFilter,
    sendReceipt,
    setSendReceipt,
    printReport,
    setPrintReport,
    orderDetailsExpanded,
    setOrderDetailsExpanded,
    addItemExpanded,
    setAddItemExpanded,

    // Add Item
    itemNumber,
    setItemNumber,
    quantity,
    setQuantity,
    unit,
    setUnit,
    salesPrice,
    setSalesPrice,
    description,
    setDescription,
    altNumber,
    setAltNumber,
    inventoryData,

    // Items table
    inventoryItems,
    setInventoryItems,
    selectedItems,
    toggleItemSelection,
    toggleAllItems,

    // Utils
    calculateTotal,
  } as unknown as RequisitionFormState; // keep compatibility until your types are updated
}
