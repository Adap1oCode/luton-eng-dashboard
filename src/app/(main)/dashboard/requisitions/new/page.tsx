"use client";
import React, { useState } from "react";

import {
  Calendar,
  Clock,
  Plus,
  Minus,
  Search,
  Filter,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const RequisitionOrderForm = () => {
  const [orderDate, setOrderDate] = useState("10/04/2025 20:36");
  const [dueDate, setDueDate] = useState("18/04/2025 20:00");
  const [warehouse, setWarehouse] = useState("AM - WH 1");
  const [email, setEmail] = useState("");
  const [contractNumber, setContractNumber] = useState("SALTPOND TOWERLINE");
  const [notes, setNotes] = useState("");
  const [po, setPo] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [sendReceipt, setSendReceipt] = useState(false);
  const [printReport, setPrintReport] = useState(false);
  const [orderDetailsExpanded, setOrderDetailsExpanded] = useState(true);
  const [addItemExpanded, setAddItemExpanded] = useState(false);

  // Add Item Form States
  const [itemNumber, setItemNumber] = useState("1");
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState("Ea");
  const [salesPrice, setSalesPrice] = useState(0.0);
  const [description, setDescription] = useState("SINGLE SEAT RECEPTION");
  const [altNumber, setAltNumber] = useState("");

  // Mock inventory data
  const inventoryData = {
    available: 38,
    onOrder: 0,
    onPick: 0,
    forecasted: 38,
  };

  const [inventoryItems] = useState([
    {
      id: 1,
      type: "Inventory",
      itemNo: "506103737645",
      description: "COIL CLAMP",
      requested: 10,
      unit: "Ea",
      picked: 10,
      outstanding: 0,
      salesPrice: 0,
      lineTotal: 0,
    },
    {
      id: 2,
      type: "Inventory",
      itemNo: "506103739519",
      description: "ARMOURED ROD (L)",
      requested: 35,
      unit: "Ea",
      picked: 35,
      outstanding: 0,
      salesPrice: 0,
      lineTotal: 0,
    },
    {
      id: 3,
      type: "Inventory",
      itemNo: "506103739571",
      description: "33KV TENSION CLAMPS C/W CLEVIS EYE",
      requested: 5,
      unit: "Ea",
      picked: 5,
      outstanding: 0,
      salesPrice: 0,
      lineTotal: 0,
    },
    {
      id: 4,
      type: "Inventory",
      itemNo: "506103739007",
      description: "265MM2 ALU CONDUCTOR",
      requested: 2000,
      unit: "Ea",
      picked: 0,
      outstanding: 2000,
      salesPrice: 0,
      lineTotal: 0,
    },
    {
      id: 5,
      type: "Inventory",
      itemNo: "506103739908",
      description: "VIBRATION DAMPERS (265SQMM)",
      requested: 70,
      unit: "Ea",
      picked: 70,
      outstanding: 0,
      salesPrice: 0,
      lineTotal: 0,
    },
  ]);

  const [selectedItems, setSelectedItems] = useState(new Set());

  const toggleItemSelection = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleAllItems = () => {
    if (selectedItems.size === inventoryItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(inventoryItems.map((item) => item.id)));
    }
  };

  const calculateTotal = () => {
    return (quantity * salesPrice).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex-shrink-0 rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
              <svg className="h-6 w-6 text-gray-600 dark:text-gray-200" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="mb-2 text-xl font-semibold text-gray-900 sm:text-2xl dark:text-gray-100">
                View/Edit Requisition Order
              </h1>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                Pick Orders are orders that you create when inventory is requested by a customer and needs to be picked
                from your warehouse, store, storage facility, etc and shipped to the customer.
              </p>
            </div>
          </div>
        </div>

        {/* Order Details Section */}
        <div className="mb-6 rounded-lg bg-white shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Order Details</h2>
            <button
              onClick={() => setOrderDetailsExpanded(!orderDetailsExpanded)}
              className="p-1 text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
            >
              {orderDetailsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          {orderDetailsExpanded && (
            <div className="p-6">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left Column - Order Information */}
                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Requisition Order / Transfer Req. Order
                    </label>
                    <input
                      type="text"
                      value="LUT/REQ/AMT/2248/01/25"
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Project</label>
                    <input
                      type="text"
                      value="Cape Coast - Warehouse Cap..."
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Contact</label>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Email</label>
                      <textarea
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                        rows={2}
                        placeholder="Separate email addresses with commas"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Contract Number
                    </label>
                    <input
                      type="text"
                      value={contractNumber}
                      onChange={(e) => setContractNumber(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Middle Column - Dates and Warehouse */}
                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Warehouse</label>
                    <div className="relative">
                      <select
                        value={warehouse}
                        onChange={(e) => setWarehouse(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                      >
                        <option value="AM - WH 1">AM - WH 1</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-gray-400 dark:text-gray-300" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Order Date
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center space-x-2 pr-3">
                        <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                        <Clock className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Due Date</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center space-x-2 pr-3">
                        <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                        <Clock className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">PO#</label>
                    <input
                      type="text"
                      value={po}
                      onChange={(e) => setPo(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                    />
                  </div>
                </div>

                {/* Right Column - Status and Totals */}
                <div className="space-y-6">
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Status:</span>
                      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-700 dark:text-orange-100">
                        OverDue
                      </span>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-800/30">
                      <span className="text-sm font-medium text-red-700 dark:text-red-200">
                        In Progress - Pick Order Picked Short
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Items Total</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">0.00</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Shipping Cost</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">0.00</span>
                        <ChevronUp className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300">Tax</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">0.00</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">%</span>
                        <ChevronUp className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Total</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">0.00</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 rounded-lg bg-white shadow-sm dark:bg-gray-800">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button className="border-b-2 border-transparent px-6 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">
              Address Details
            </button>
            <button className="border-b-2 border-blue-600 bg-blue-50 px-6 py-3 text-sm font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-200">
              Line Items
            </button>
          </div>
        </div>

        {/* Add Item Section */}
        <div className="mb-6 rounded-lg bg-white shadow-sm dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Item</h3>
            <button
              onClick={() => setAddItemExpanded(!addItemExpanded)}
              className="p-1 text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
            >
              {addItemExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          {addItemExpanded && (
            <div className="p-6">
              <div className="mb-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Left Column - Editable Form */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Item Number
                    </label>
                    <input
                      type="text"
                      value={itemNumber}
                      onChange={(e) => setItemNumber(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Unit</label>
                      <div className="relative">
                        <select
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                        >
                          <option value="Ea">Ea</option>
                          <option value="Kg">Kg</option>
                          <option value="Lt">Lt</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-gray-400 dark:text-gray-300" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Sales Price
                    </label>
                    <div className="flex">
                      <input
                        type="number"
                        step="0.01"
                        value={salesPrice}
                        onChange={(e) => setSalesPrice(Number(e.target.value))}
                        className="flex-1 rounded-l-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="flex items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        / {unit}
                      </span>
                      <button className="ml-2 px-3 py-2 text-sm text-blue-600 underline hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200">
                        View Price Tiers
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Total</label>
                    <input
                      type="text"
                      value={calculateTotal()}
                      className="border-input bg-muted text-muted-foreground w-full rounded-lg border px-3 py-2"
                      readOnly
                    />
                  </div>

                  <Button className="w-full sm:w-auto">Add</Button>
                </div>

                {/* Right Column - View Only Information */}
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                      ALT Number
                    </label>
                    <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {altNumber || "-"}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                      Description
                    </label>
                    <div className="min-h-[96px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                      {description}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                      (Unit - {unit})
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="text-center">
                        <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">Available</div>
                        <div className="rounded border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-700">
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {inventoryData.available}
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">On Order</div>
                        <div className="rounded border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-700">
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {inventoryData.onOrder}
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">On Pick</div>
                        <div className="rounded border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-700">
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {inventoryData.onPick}
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">Forecasted</div>
                        <div className="rounded border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-700">
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {inventoryData.forecasted}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="mb-6 rounded-lg bg-white shadow-sm dark:bg-gray-800">
          <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center dark:border-gray-700">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => setShowFilter(!showFilter)} variant="ghost" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Show Filter
              </Button>
              <Button variant="destructive" className="hover:bg-destructive/90">
                Remove
              </Button>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-12 p-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleAllItems}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {selectedItems.size === inventoryItems.length ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  </th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium tracking-wider uppercase">
                    Type
                  </th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium tracking-wider uppercase">
                    Item No.
                  </th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium tracking-wider uppercase">
                    Description
                  </th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium tracking-wider uppercase">
                    Requested
                  </th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium tracking-wider uppercase">
                    Unit
                  </th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium tracking-wider uppercase">
                    Picked
                  </th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium tracking-wider uppercase">
                    Outstanding
                  </th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium tracking-wider uppercase">
                    Sales Price
                  </th>
                  <th className="text-muted-foreground p-3 text-left text-xs font-medium tracking-wider uppercase">
                    Line Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {inventoryItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-3">
                      <button
                        onClick={() => toggleItemSelection(item.id)}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                      >
                        {selectedItems.has(item.id) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="p-3 text-sm text-gray-900 dark:text-gray-100">{item.type}</td>
                    <td className="p-3">
                      <div className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                        {item.itemNo}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">INV</div>
                    </td>
                    <td className="p-3 text-sm text-gray-900 dark:text-gray-100">{item.description}</td>
                    <td className="p-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.requested}</td>
                    <td className="p-3 text-sm text-gray-900 dark:text-gray-100">{item.unit}</td>
                    <td className="p-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.picked}</td>
                    <td className="p-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.outstanding}</td>
                    <td className="p-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.salesPrice}</td>
                    <td className="p-3 text-sm font-medium text-gray-900 dark:text-gray-100">{item.lineTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden">
            <div className="p-4">
              <div className="mb-4 flex items-center gap-3">
                <button
                  onClick={toggleAllItems}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  {selectedItems.size === inventoryItems.length ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Select All Items</span>
              </div>

              <div className="space-y-4">
                {inventoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleItemSelection(item.id)}
                          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
                        >
                          {selectedItems.has(item.id) ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                        <div>
                          <div className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                            {item.itemNo}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{item.type} - INV</div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <h4 className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">Description</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{item.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-300">Requested:</span>
                        <span className="ml-1 font-bold text-gray-900 dark:text-gray-100">
                          {item.requested} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-300">Picked:</span>
                        <span className="ml-1 font-bold text-gray-900 dark:text-gray-100">
                          {item.picked} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-300">Outstanding:</span>
                        <span className="ml-1 font-bold text-gray-900 dark:text-gray-100">
                          {item.outstanding} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-300">Total:</span>
                        <span className="ml-1 font-bold text-gray-900 dark:text-gray-100">{item.lineTotal}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={sendReceipt}
                  onChange={(e) => setSendReceipt(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-200">Send receipt copy to customer</span>
              </label>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={printReport}
                  onChange={(e) => setPrintReport(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 dark:text-gray-200">Print Report</span>
              </label>
              <div className="relative">
                <select className="appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700">
                  <option>Pick Order Report - DO...</option>
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 transform text-gray-400 dark:text-gray-300" />
              </div>
            </div>

            <div className="flex w-full items-center gap-3 sm:w-auto">
              <button className="flex-1 rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:flex-none dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                Cancel
              </button>
              <div className="relative">
                <Button className="w-full sm:w-auto">
                  Save, Send & Issue
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function NewRequisitionPage() {
  return (
    <div className="bg-background min-h-screen">
      <div className="w-full p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-foreground text-2xl font-bold sm:text-3xl">New Requisition</h1>
        </div>
        <RequisitionOrderForm />
      </div>
    </div>
  );
}
