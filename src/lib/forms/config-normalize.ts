import type { FormConfig } from "@/components/forms/dynamic-form";

export function getAllFields(cfg: FormConfig) {
  return cfg.sections?.length ? cfg.sections.flatMap(s => s.fields) : (cfg.fields ?? []);
}

export function ensureSections(cfg: FormConfig): FormConfig {
  if (cfg.sections?.length) return cfg;
  return {
    ...cfg,
    sections: [{
      key: "details",
      title: "Details",
      defaultOpen: true,
      layout: { columns: 3, fill: "row" },
      fields: cfg.fields ?? [],
    }],
  };
}

// Map legacy width hint to span only if span isn't set
export function widthToSpan(width: "full" | "half" | "third" | undefined, columns: number) {
  if (!width) return 1;
  if (width === "full") return columns;
  if (width === "half") return Math.max(1, Math.floor(columns / 2));
  if (width === "third") return Math.max(1, Math.floor(columns / 3));
  return 1;
}
