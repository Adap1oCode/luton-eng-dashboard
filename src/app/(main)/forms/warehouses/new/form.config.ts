// src/app/(main)/forms/warehouses/new/form.config.ts
import { z } from "zod";
import type { FormConfig } from "@/lib/forms/types";

// Form schema for validation
export const formSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  is_active: z.boolean().optional().default(true),
});

// Default values for the form
export const defaultValues = {
  code: "",
  name: "",
  is_active: true,
};

/**
 * Pattern:
 * - `fields` stays for schema/defaults (hidden, server-managed, etc.)
 * - `sections` drives layout (SectionCard + responsive 3-col grid)
 */
export const warehouseCreateConfig: FormConfig & {
  submit?: (values: any) => Promise<any>;
  redirectTo?: (result: any) => string | null | undefined;

  sections?: Array<{
    key: string;
    title: string;
    defaultOpen?: boolean;
    layout?: { columns?: 1 | 2 | 3 | 4; fill?: "row" | "column" };
    fields: Array<{
      name: string;
      label: string;
      kind: "text" | "number" | "textarea" | "select" | "multiselect" | "date" | "checkbox";
      required?: boolean;
      placeholder?: string;
      description?: string;
      hidden?: boolean;
      readOnly?: boolean;
      column?: 1 | 2 | 3 | 4;
      span?: 1 | 2 | 3 | 4;
      width?: "full" | "half" | "third";
    }>;
  }>;
} = {
  key: "warehouses",
  title: "New Warehouse",
  subtitle: "Create a new warehouse",
  permissionKey: "resource:warehouses:create",
  resource: "warehouses",
  submitLabel: "Save Warehouse",

  fields: [
    {
      name: "code",
      label: "Code",
      kind: "text",
      required: true,
      placeholder: "e.g. WH-001",
    },
    {
      name: "name",
      label: "Name",
      kind: "text",
      required: true,
      placeholder: "e.g. Main Warehouse",
    },
    {
      name: "is_active",
      label: "Active",
      kind: "checkbox",
      required: false,
    },
  ],

  sections: [
    {
      key: "details",
      title: "Details",
      defaultOpen: true,
      layout: { columns: 2, fill: "row" },
      fields: [
        {
          name: "code",
          label: "Code",
          kind: "text",
          required: true,
          placeholder: "e.g. WH-001",
        },
        {
          name: "name",
          label: "Name",
          kind: "text",
          required: true,
          placeholder: "e.g. Main Warehouse",
        },
        {
          name: "is_active",
          label: "Active",
          kind: "checkbox",
          required: false,
          span: 2,
        },
      ],
    },
  ],

  async submit(values) {
    const res = await fetch("/api/forms/warehouses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json().catch(() => ({}));
  },

  redirectTo(result) {
    return result?.id ? `/forms/warehouses/${result.id}` : `/forms/warehouses`;
  },
};


