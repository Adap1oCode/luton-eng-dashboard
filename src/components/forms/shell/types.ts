// shared toolbar button type for shell + pages
export type ToolbarButton = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost";
  href?: string;
  onClickId?: string;
  disabled?: boolean;
  className?: string;
  trailingIcon?: React.ComponentType<{ className?: string }>;
  menu?: {
    align?: "start" | "end";
    items: Array<{
      id: string;
      label: string;
      icon?: React.ComponentType<{ className?: string }>;
      href?: string;
      onClickId?: string;
      disabled?: boolean;
    }>;
  };
};
