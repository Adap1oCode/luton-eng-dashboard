"use client";

import * as React from "react";

import { ChevronUp, ChevronDown } from "lucide-react";

type SectionCardProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
};

/**
 * Collapsible white card with exact header + body padding.
 * This matches the Requisition section card structure/classes.
 */
export default function SectionCard({ title, defaultOpen = true, children, headerRight }: SectionCardProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="mb-6 rounded-lg bg-white shadow-sm dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        <div className="flex items-center gap-2">
          {headerRight}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="p-1 text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
            aria-label={open ? "Collapse section" : "Expand section"}
          >
            {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open ? <div className="p-6">{children}</div> : null}
    </div>
  );
}
