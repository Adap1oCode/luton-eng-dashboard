// src/lib/metadata-title.ts
export const titleFor = {
  list: (resource: string) => resource,
  new: (resource: string) => `New ${resource}`,
  edit: (resource: string, label?: string) => `Edit ${resource}${label ? ` ${label}` : ""}`,
  details: (resource: string, label?: string) => `${resource} Details${label ? ` ${label}` : ""}`,
};
// usage: export const metadata = { title: titleFor.list("Stock Adjustments") }
