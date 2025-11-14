// src/app/(main)/forms/permissions/new/form.config.ts
import { z } from "zod";
import type { FormConfig } from "@/lib/forms/types";

// Form schema for validation
export const formSchema = z.object({
  key: z.string().min(1, "Key is required"),
  description: z.string().optional().nullable(),
});

// Default values for the form
export const defaultValues = {
  key: "",
  description: "",
};

/**
 * Pattern:
 * - `fields` stays for schema/defaults (hidden, server-managed, etc.)
 * - `sections` drives layout (SectionCard + responsive 3-col grid)
 */
export const permissionCreateConfig: FormConfig & {
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
  key: "permissions",
  title: "New Permission",
  subtitle: "Create a new permission",
  permissionKey: "screen:permissions:create",
  resource: "permissions",
  submitLabel: "Save Permission",

  fields: [
    {
      name: "key",
      label: "Key",
      kind: "text",
      required: true,
      placeholder: "e.g. resource:users:create",
      description: "Permission key identifier (e.g. resource:users:create)",
    },
    {
      name: "description",
      label: "Description",
      kind: "textarea",
      required: false,
      placeholder: "Optional description of what this permission allows",
    },
  ],

  sections: [
    {
      key: "details",
      title: "Permission Details",
      defaultOpen: true,
      layout: { columns: 1, fill: "column" },
      fields: [
        {
          name: "key",
          label: "Key",
          kind: "text",
          required: true,
          placeholder: "e.g. resource:users:create",
          description: "Permission key identifier (e.g. resource:users:create)",
        },
        {
          name: "description",
          label: "Description",
          kind: "textarea",
          required: false,
          placeholder: "Optional description of what this permission allows",
          span: 1,
        },
      ],
    },
  ],

  async submit(values) {
    const res = await fetch("/api/forms/permissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json().catch(() => ({}));
  },

  redirectTo(result) {
    return result?.key ? `/forms/permissions/${encodeURIComponent(result.key)}/edit` : `/forms/permissions`;
  },
};

