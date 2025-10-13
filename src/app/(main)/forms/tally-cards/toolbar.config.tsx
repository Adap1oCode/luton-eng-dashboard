"use client";

import * as React from "react";

import { Plus, Download } from "lucide-react";

// Remove duplicate type definitions and just export the values
export const tallyCardsToolbar = {
  right: [
    { id: "new", label: "New Tally Card", icon: Plus, variant: "default" as const, href: "/forms/tally-cards/new" },
    { id: "export", label: "Export", icon: Download, variant: "outline" as const, onClickId: "exportCsv" },
  ],
};

export const tallyCardsChips = undefined;

export const tallyCardsActionMenu = [
  { id: "edit", label: "Edit" },
  { id: "copy", label: "Copy" },
  { id: "favorite", label: "Favorite" },
  { id: "delete", label: "Delete" },
];
