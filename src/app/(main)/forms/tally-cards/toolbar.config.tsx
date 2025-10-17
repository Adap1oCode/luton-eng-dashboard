import type { ToolbarConfig, ChipsConfig, ActionConfig } from "@/components/forms/shell/toolbar/types";

export const tallyCardsToolbar: ToolbarConfig = {
  left: [
    { id: "new", label: "New Tally Card", icon: "Plus", variant: "default", href: "/forms/tally-cards/new" },
    {
      id: "delete",
      label: "Delete",
      icon: "Delete Selected",
      variant: "destructive",
      action: "deleteSelected",
      enableWhen: "anySelected",
    },
  ],
  right: [],
};

export const tallyCardsActions: ActionConfig = {
  deleteSelected: {
    method: "DELETE",
    endpoint: "/api/tally_cards/bulk-delete",
  },
  exportCsv: {
    method: "GET",
    endpoint: "/api/tally_cards/export",
    target: "_blank",
  },
};

export const tallyCardsChips: ChipsConfig | undefined = undefined;

export const tallyCardsActionMenu = [
  { id: "edit", label: "Edit", herf: "/forms/tally-cards/new" },
  { id: "copy", label: "Copy" },
  { id: "favorite", label: "Favorite" },
  { id: "delete", label: "Delete" },
];
