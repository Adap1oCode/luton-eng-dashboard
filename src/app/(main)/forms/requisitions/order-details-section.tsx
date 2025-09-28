"use client";

import React from "react";
import { Calendar, Clock, ChevronDown, ChevronUp } from "lucide-react";

import type { RequisitionFormState } from "./types";

type Props = { form: RequisitionFormState };

export default function OrderDetailsSection({ form }: Props) {
  const {
    orderDetailsExpanded,
    setOrderDetailsExpanded,
    orderDate,
    setOrderDate,
    dueDate,
    setDueDate,
    warehouse,
    setWarehouse,
    // NEW for Project + dropdown lists:
    project,
    setProject,
    sites,
    customers,

    email,
    setEmail,
    contractNumber,
    setContractNumber,
    notes,
    setNotes,
    po,
    setPo,
  } = form;

  return (
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
            {/* Left Column */}
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

              {/* Project = Customers (select) */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Project</label>
                <div className="relative">
                  <select
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.name ?? c.id}>
                        {c.name ?? c.id}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-gray-400 dark:text-gray-300" />
                </div>
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

            {/* Middle Column */}
            <div className="space-y-6">
              {/* Warehouse = Sites (select) */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Warehouse</label>
                <div className="relative">
                  <select
                    value={warehouse}
                    onChange={(e) => setWarehouse(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700"
                  >
                    {sites.map((s) => {
                      const display = s.name ?? s.description ?? s.code ?? s.id;
                      return (
                        <option key={s.id} value={display}>
                          {display}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform text-gray-400 dark:text-gray-300" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Order Date</label>
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

            {/* Right Column (unchanged visuals) */}
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
  );
}
