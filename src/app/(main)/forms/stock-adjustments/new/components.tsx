"use client";

import React from "react";

export function NewStockAdjustmentPageHeader() {
  return (
    <div className="rounded-xl bg-white p-8 shadow-md dark:bg-gray-800">
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          <svg className="h-14 w-14 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H11V21H5V3H13V9H21ZM14 10V12H16V10H14ZM16 14H14V16H16V14ZM20.5 18.5L19.09 17.09L15.5 20.68L13.91 19.09L12.5 20.5L15.5 23.5L20.5 18.5Z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Stock Adjustment</h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Add a new stock adjustment with detailed information
          </p>
        </div>
      </div>
    </div>
  );
}

export function NewStockAdjustmentToolbar() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-md dark:bg-gray-800">
      <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-md bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
            New Stock Adjustment Form
          </div>
          <div className="rounded-md bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            Ready to Save
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-base text-gray-600 dark:text-gray-400">
            Fill in the required fields to create the stock adjustment
          </div>
        </div>
      </div>
    </div>
  );
}
