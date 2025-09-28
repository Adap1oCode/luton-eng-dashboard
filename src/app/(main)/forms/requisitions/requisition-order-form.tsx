"use client";

import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

import AddItemSection from "./add-item-section";
import FooterActions from "./footer-actions";
import { useRequisitionForm } from "./hooks/use-requisition-form";
import ItemsTable from "./items-table";
import OrderDetailsSection from "./order-details-section";

export default function RequisitionOrderForm() {
  const form = useRequisitionForm(); // holds all state & helpers (keeps layout identical)

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

        {/* Order Details */}
        <OrderDetailsSection form={form} />

        {/* Navigation Tabs (visual only – unchanged) */}
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

        {/* Add Item */}
        <AddItemSection form={form} />

        {/* Items Table */}
        <ItemsTable form={form} />

        {/* Footer Actions */}
        <FooterActions form={form} />
      </div>
    </div>
  );
}
