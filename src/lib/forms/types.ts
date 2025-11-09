// ---------------------------------------------------------------------------
// lib/forms/types.ts (SHARED)
// ---------------------------------------------------------------------------
export type Option = { id: string; label: string };

export type FieldKind = "text" | "number" | "textarea" | "select" | "multiselect" | "date" | "checkbox";

export type FieldDef = {
  name: string; // e.g. "vendor_id"
  label: string; // UI label
  kind: FieldKind; // widget type
  required?: boolean; // validation
  placeholder?: string;
  description?: string;
  defaultValue?: any; // default value (client+server)
  hidden?: boolean; // do not render but keep in schema
  readOnly?: boolean; // render as read-only
  width?: "full" | "half" | "third"; // layout hint
  optionsKey?: string; // option-provider registry key
  dependsOn?: { field: string; param: string }; // dynamic option dep
};

export type SectionDef = {
  key: string;
  title: string;
  defaultOpen?: boolean;
  headerRight?: React.ReactNode;
  layout?: { columns?: 1 | 2 | 3 | 4; fill?: "row" | "column" };
  fields: FieldDef[];
};

export type FormConfig = {
  key: string; // e.g. "order.create"
  title: string; // page heading
  subtitle?: string; // page subheading
  permissionKey: string; // e.g. "resource:orders:create"
  resource: string; // e.g. "orders"
  fields?: FieldDef[]; // field list (legacy, used for schema/defaults)
  sections?: SectionDef[]; // sections (preferred for layout)
  submitLabel?: string; // button text
};

export type ResolvedOptions = Record<string, Option[]>; // { warehouses: [...], vendors: [...] }
