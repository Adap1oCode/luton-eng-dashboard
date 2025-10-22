import type { ToolbarConfig, ChipsConfig, ActionConfig } from "@/components/forms/shell/toolbar/types";

// Base toolbar configuration
export const baseTallyCardsToolbar: ToolbarConfig = {
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
    { id: "exportCsv", label: "Export CSV", icon: "Download", variant: "outline", onClickId: "exportCsv" },
  ],
  right: [],
};

// Function to create dynamic toolbar based on state
export const createTallyCardsToolbar = (hasSorting: boolean, hasFilters: boolean): ToolbarConfig => {
  const rightButtons = [];

  if (hasSorting) {
    rightButtons.push({
      id: "appliedSorting",
      label: "Sorting Applied",
      variant: "secondary" as const,
      onClickId: "clearSorting",
    });
  }

  if (hasFilters) {
    rightButtons.push({
      id: "appliedFilters",
      label: "Filter Applied",
      variant: "secondary" as const,
      onClickId: "clearFilters",
    });
  }

  console.log("Creating toolbar with:", { hasSorting, hasFilters, rightButtons });

  return {
    ...baseTallyCardsToolbar,
    right: rightButtons,
  };
};

// Default export for backward compatibility
export const tallyCardsToolbar: ToolbarConfig = baseTallyCardsToolbar;

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
  { id: "edit", label: "Edit", href: "/forms/tally-cards/new" },
  { id: "copy", label: "Copy" },
  { id: "favorite", label: "Favorite" },
  { id: "delete", label: "Delete" },
];
