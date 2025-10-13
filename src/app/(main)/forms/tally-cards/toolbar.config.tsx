"use client";

import * as React from "react";

import { Plus, Download } from "lucide-react";

// Remove duplicate type definitions and just export the values
export const tallyCardsToolbar = {
  right: [
    { id: "new", label: "New Role", icon: Plus, variant: "default" as const, href: "/forms/roles/new" },
    { id: "export", label: "Export", icon: Download, variant: "outline" as const, onClickId: "exportCsv" },
  ],
};

export const tallyCardsChips = undefined;
