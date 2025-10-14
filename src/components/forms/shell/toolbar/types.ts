export type EnableRule = "none" | "oneSelected" | "anySelected";

export type MenuItem = {
  id: string;
  label: string;
  icon?: string;
  href?: string;
  action?: string;
  onClickId?: string;
  disabled?: boolean;
};

export type MenuConfig = {
  align?: "start" | "end";
  items: MenuItem[];
};

export type ToolbarButton = {
  id: string;
  label: string;
  icon?: string; // lucide icon name consumed by render-button-client
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost" | "link";
  href?: string; // navigate if present
  action?: string; // dispatch to actions.ts if present
  onClickId?: string;
  enableWhen?: EnableRule; // default 'none'
  menu?: MenuConfig; // optional dropdown menu
};

export type ToolbarConfig = {
  primary?: ToolbarButton[];
  left?: ToolbarButton[];
  right?: ToolbarButton[];
};

export type ChipsConfig = {
  filter?: boolean;
  sorting?: boolean;
};

export type ActionEndpoint = {
  method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  endpoint: string; // may include :id for single-selected
  target?: "_blank"; // optional (e.g. print/export)
};

export type ActionConfig = Record<string, ActionEndpoint>;
