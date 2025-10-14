import type { ToolbarConfig, ChipsConfig } from "@/components/forms/shell/toolbar/types";

export const tallyCardsToolbar: ToolbarConfig = {
  right: [
    { id: "new", label: "New Tally Card", icon: "Plus", variant: "default", href: "/forms/tally-cards/new" },
    { id: "export", label: "Export", icon: "Download", variant: "outline", action: "exportCsv" },
  ],
};

export const tallyCardsChips: ChipsConfig | undefined = undefined;

export const tallyCardsActionMenu = [
  { id: "edit", label: "Edit" },
  { id: "copy", label: "Copy" },
  { id: "favorite", label: "Favorite" },
  { id: "delete", label: "Delete" },
];
