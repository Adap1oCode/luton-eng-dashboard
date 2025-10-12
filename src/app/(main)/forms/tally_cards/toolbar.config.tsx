"use client";

import { Plus, Trash2, Copy, Printer, FileText, Package, Download, Save } from "lucide-react";
import type { ToolbarButton } from "@/components/forms/shell/types";

export const tallyCardsToolbar: {
  primary: ToolbarButton[];
  left: ToolbarButton[];
  right: ToolbarButton[];
} = {
  primary: [
    { id: "new", label: "New", icon: Plus, href: "/forms/tally_cards/new" },
    { id: "delete", label: "Delete", icon: Trash2, href: "/forms/tally_cards/delete" },
    { id: "duplicate", label: "Duplicate", icon: Copy, href: "/forms/tally_cards/duplicate" },
  ],
  left: [
    { id: "print_report", label: "Print Report", icon: Printer, href: "/forms/tally_cards/print/report" },
    { id: "print_invoice", label: "Print Invoice", icon: FileText, href: "/forms/tally_cards/print/invoice" },
    { id: "print_packing_slip", label: "Print Packing Slip", icon: Package, href: "/forms/tally_cards/print/packing-slip" },
  ],
  right: [
    { id: "export_csv", label: "Export CSV", icon: Download, href: "/forms/tally_cards/export.csv" },
    { id: "save_view", label: "Save View", icon: Save, href: "/forms/tally_cards/save-view" },
  ],
};

export const tallyCardsChips = {
  filter: true,
  sorting: true,
} as const;
