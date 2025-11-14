// src/app/(main)/forms/users/new/form.config.ts
import { z } from "zod";
import type { FormConfig } from "@/lib/forms/types";

// Form schema for validation
export const formSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email().optional().nullable(),
  role_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  is_roles_admin: z.boolean().optional().default(false),
});

// Default values for the form
export const defaultValues = {
  full_name: "",
  email: "",
  role_id: null,
  is_active: true,
  is_roles_admin: false,
};

/**
 * Pattern:
 * - `fields` stays for schema/defaults (hidden, server-managed, etc.)
 * - `sections` drives layout (SectionCard + responsive 3-col grid)
 */
export const userCreateConfig: FormConfig & {
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
      optionsKey?: string;
    }>;
  }>;
} = {
  key: "users",
  title: "New User",
  subtitle: "Create a new user",
  permissionKey: "screen:users:create",
  resource: "users",
  submitLabel: "Save User",

  fields: [
    {
      name: "full_name",
      label: "Full Name",
      kind: "text",
      required: true,
      placeholder: "e.g. John Doe",
    },
    {
      name: "email",
      label: "Email",
      kind: "text",
      required: false,
      placeholder: "e.g. john.doe@example.com",
    },
    {
      name: "role_id",
      label: "Role",
      kind: "select",
      required: false,
      optionsKey: "roles",
      placeholder: "Select a role",
    },
    {
      name: "is_active",
      label: "Active",
      kind: "checkbox",
      required: false,
    },
    {
      name: "is_roles_admin",
      label: "Roles Admin",
      kind: "checkbox",
      required: false,
    },
  ],

  sections: [
    {
      key: "details",
      title: "User Details",
      defaultOpen: true,
      layout: { columns: 2, fill: "row" },
      fields: [
        {
          name: "full_name",
          label: "Full Name",
          kind: "text",
          required: true,
          placeholder: "e.g. John Doe",
        },
        {
          name: "email",
          label: "Email",
          kind: "text",
          required: false,
          placeholder: "e.g. john.doe@example.com",
        },
        {
          name: "role_id",
          label: "Role",
          kind: "select",
          required: false,
          optionsKey: "roles",
          placeholder: "Select a role",
        },
        {
          name: "is_active",
          label: "Active",
          kind: "checkbox",
          required: false,
          span: 1,
        },
        {
          name: "is_roles_admin",
          label: "Roles Admin",
          kind: "checkbox",
          required: false,
          span: 1,
        },
      ],
    },
  ],

  async submit(values) {
    const res = await fetch("/api/forms/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json().catch(() => ({}));
  },

  redirectTo(result) {
    return result?.id ? `/forms/users/${result.id}/edit` : `/forms/users`;
  },
};

