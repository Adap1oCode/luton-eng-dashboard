"use client";

import React from "react";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { RequisitionFormState } from "./types";

type Props = { form: RequisitionFormState };

export default function FooterActions({ form }: Props) {
  const { sendReceipt, setSendReceipt, printReport, setPrintReport } = form;

  return (
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
              Save, Send &amp; Issue
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
