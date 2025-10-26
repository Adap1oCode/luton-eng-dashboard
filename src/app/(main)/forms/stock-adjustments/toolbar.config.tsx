// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/toolbar.config.tsx
// TYPE: Config
// PURPOSE: Generic toolbar + actions + chips for the Stock Adjustments screen.
// NOTES:
//  • UI path is /forms/stock-adjustments
//  • API base maps to the User Tally Card Entries resource
//    (i.e., /api/user_tally_card_entries), not stock-adjustments.
// -----------------------------------------------------------------------------

import { Plus, Trash2 } from "lucide-react";
import type {
  ToolbarConfig,
  ChipsConfig,
  ActionConfig,
} from "@/components/forms/shell/toolbar/types";

// Backend resource: user_tally_card_entries
const BASE_API = "/api/tcm_user_tally_card_entries";

export const stockAdjustmentsToolbar: ToolbarConfig = {
  left: [
    {
      id: "new",
      label: "New Adjustment",
      icon: "Plus",
      variant: "default",
      href: "/forms/stock-adjustments/new",
      requiredAny: ["resource:tcm_user_tally_card_entries:create"],
    },
    {
      id: "delete",
      label: "Delete",
      icon: "Trash2",
      variant: "destructive",
      action: "deleteSelected",
      enableWhen: "anySelected",
      requiredAny: ["resource:tcm_user_tally_card_entries:delete"],
    },
  ],
  right: [
    // Add export/filter/etc. on the right as needed
  ],
};

export const stockAdjustmentsActions: ActionConfig = {
  deleteSelected: {
    method: "DELETE",
    endpoint: `${BASE_API}/bulk-delete`,
  },
  exportCsv: {
    method: "GET",
    endpoint: `${BASE_API}/export`,
    target: "_blank",
  },
};

export const stockAdjustmentsChips: ChipsConfig | undefined = undefined;

// Optional row action menu (wire if needed in your actions column)
export const stockAdjustmentsActionMenu = [
  { id: "edit", label: "Edit" },
  { id: "copy", label: "Copy" },
  { id: "favorite", label: "Favorite" },
  { id: "delete", label: "Delete" },
];
