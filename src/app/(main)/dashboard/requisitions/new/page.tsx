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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex-shrink-0 rounded-lg bg-gray-100 p-3">
              <svg className="h-6 w-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="mb-2 text-xl font-semibold text-gray-900 sm:text-2xl">View/Edit Requisition Order</h1>
              <p className="text-sm leading-relaxed text-gray-600">
                Pick Orders are orders that you create when inventory is requested by a customer and needs to be picked
                from your warehouse, store, storage facility, etc and shipped to the customer.
              </p>
            </div>
          </div>
        </div>

        {/* Order Details Section */}
        <div className="mb-6 rounded-lg bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
            <button
              onClick={() => setOrderDetailsExpanded(!orderDetailsExpanded)}
              className="p-1 text-gray-400 transition-colors hover:text-gray-600"
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
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Requisition Order / Transfer Req. Order
                    </label>
                    <input
                      type="text"
                      value="LUT/REQ/AMT/2248/01/25"
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Project</label>
                    <input
                      type="text"
                      value="Cape Coast - Warehouse Cap..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Contact</label>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Email</label>
                      <textarea
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        rows={2}
                        placeholder="Separate email addresses with commas"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Contract Number</label>
                    <input
                      type="text"
                      value={contractNumber}
                      onChange={(e) => setContractNumber(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Middle Column - Dates and Warehouse */}
                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Warehouse</label>
                    <div className="relative">
                      <select
                        value={warehouse}
                        onChange={(e) => setWarehouse(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="AM - WH 1">AM - WH 1</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Order Date</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center space-x-2 pr-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <Clock className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Due Date</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center space-x-2 pr-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <Clock className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">PO#</label>
                    <input
                      type="text"
                      value={po}
                      onChange={(e) => setPo(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Right Column - Status and Totals */}
                <div className="space-y-6">
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
                        OverDue
                      </span>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <span className="text-sm font-medium text-red-700">In Progress - Pick Order Picked Short</span>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Items Total</span>
                      <span className="font-semibold text-gray-900">0.00</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Shipping Cost</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">0.00</span>
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Tax</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">0.00</span>
                        <span className="text-xs text-gray-500">%</span>
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900">Total</span>
                        <span className="text-lg font-bold text-gray-900">0.00</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 rounded-lg bg-white shadow-sm">
          <div className="flex border-b border-gray-200">
            <button className="border-b-2 border-transparent px-6 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700">
              Address Details
            </button>
            <button className="border-b-2 border-blue-600 bg-blue-50 px-6 py-3 text-sm font-medium text-blue-600">
              Line Items
            </button>
          </div>
        </div>

        {/* Add Item Section */}
        <div className="mb-6 rounded-lg bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900">Add Item</h3>
            <button
              onClick={() => setAddItemExpanded(!addItemExpanded)}
              className="p-1 text-gray-400 transition-colors hover:text-gray-600"
            >
              {addItemExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          {addItemExpanded && (
            <div className="p-6">
              <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Left Column - Description */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    rows={4}
                  ></textarea>
                </div>

                {/* Right Column - Item Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Quantity</label>
                      <input
                        type="number"
                        defaultValue="0"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Choose Unit</label>
                      <div className="relative">
                        <select className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                          <option>Choose Unit</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <div className="w-full">
                    <label className="mb-2 block text-sm font-medium text-gray-700">Sales Price</label>
                    <div className="flex flex-col sm:flex-row">
                      <input
                        type="number"
                        defaultValue="0.00"
                        className="w-full rounded-t-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:flex-1 sm:rounded-l-lg sm:rounded-r-none"
                      />
                      <button className="rounded-b-lg border border-t-0 border-l-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium whitespace-nowrap text-blue-600 transition-colors hover:bg-gray-100 sm:rounded-l-none sm:rounded-r-lg sm:border-t">
                        Price Tiers
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Total</label>
                    <input
                      type="number"
                      defaultValue="0.00"
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-4 text-center">
                  <div className="mb-1 text-xs font-medium text-gray-600">Available</div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-4 text-center">
                  <div className="mb-1 text-xs font-medium text-gray-600">On Order</div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-4 text-center">
                  <div className="mb-1 text-xs font-medium text-gray-600">On Pick</div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-4 text-center">
                  <div className="mb-1 text-xs font-medium text-gray-600">Forecasted</div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                </div>
              </div>

              <button className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700">
                Add Item
              </button>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="mb-6 rounded-lg bg-white shadow-sm">
          <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowFilter(!showFilter)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-blue-600 transition-colors hover:bg-blue-50"
              >
                <Filter className="h-4 w-4" />
                Show Filter
              </button>
              <button className="rounded-lg px-3 py-2 font-medium text-red-600 transition-colors hover:bg-red-50">
                Remove
              </button>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 p-3">
                    <button onClick={toggleAllItems} className="text-gray-400 hover:text-gray-600">
                      {selectedItems.size === inventoryItems.length ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Type</th>
                  <th className="p-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Item No.</th>
                  <th className="p-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="p-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Requested
                  </th>
                  <th className="p-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Unit</th>
                  <th className="p-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Picked</th>
                  <th className="p-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Outstanding
                  </th>
                  <th className="p-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Sales Price
                  </th>
                  <th className="p-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Line Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inventoryItems.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50">
                    <td className="p-3">
                      <button
                        onClick={() => toggleItemSelection(item.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {selectedItems.has(item.id) ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="p-3 text-sm text-gray-900">{item.type}</td>
                    <td className="p-3">
                      <div className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                        {item.itemNo}
                      </div>
                      <div className="text-xs text-gray-500">INV</div>
                    </td>
                    <td className="p-3 text-sm text-gray-900">{item.description}</td>
                    <td className="p-3 text-sm font-medium text-gray-900">{item.requested}</td>
                    <td className="p-3 text-sm text-gray-900">{item.unit}</td>
                    <td className="p-3 text-sm font-medium text-gray-900">{item.picked}</td>
                    <td className="p-3 text-sm font-medium text-gray-900">{item.outstanding}</td>
                    <td className="p-3 text-sm font-medium text-gray-900">{item.salesPrice}</td>
                    <td className="p-3 text-sm font-medium text-gray-900">{item.lineTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden">
            <div className="p-4">
              <div className="mb-4 flex items-center gap-3">
                <button onClick={toggleAllItems} className="text-gray-400 hover:text-gray-600">
                  {selectedItems.size === inventoryItems.length ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
                <span className="text-sm font-medium text-gray-700">Select All Items</span>
              </div>

              <div className="space-y-4">
                {inventoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleItemSelection(item.id)}
                          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
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
                          <div className="text-xs text-gray-500">{item.type} - INV</div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <h4 className="mb-1 text-sm font-medium text-gray-900">Description</h4>
                      <p className="text-sm text-gray-700">{item.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Requested:</span>
                        <span className="ml-1 font-bold text-gray-900">
                          {item.requested} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Picked:</span>
                        <span className="ml-1 font-bold text-gray-900">
                          {item.picked} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Outstanding:</span>
                        <span className="ml-1 font-bold text-gray-900">
                          {item.outstanding} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Total:</span>
                        <span className="ml-1 font-bold text-gray-900">{item.lineTotal}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={sendReceipt}
                  onChange={(e) => setSendReceipt(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Send receipt copy to customer</span>
              </label>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={printReport}
                  onChange={(e) => setPrintReport(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Print Report</span>
              </label>
              <div className="relative">
                <select className="appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option>Pick Order Report - DO...</option>
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              </div>
            </div>

            <div className="flex w-full items-center gap-3 sm:w-auto">
              <button className="flex-1 rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:flex-none">
                Cancel
              </button>
              <div className="relative">
                <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 sm:flex-none">
                  Save, Send & Issue
                  <ChevronDown className="h-4 w-4" />
                </button>
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
    <div className="min-h-screen bg-gray-50">
      <div className="w-full p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">New Requisition</h1>
        </div>
        <RequisitionOrderForm />
      </div>
    </div>
  );
}
