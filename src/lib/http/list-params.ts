// src/lib/http/list-params.ts
// Parse + harden query params for list endpoints, reused everywhere.

export type ListQuery = {
  q?: string;
  page: number;
  pageSize: number;
  activeOnly: boolean;
  raw: boolean;
};

export function toBool(v: string | null | undefined): boolean {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

export function toClampedInt(
  raw: string | null,
  { def, min, max }: { def: number; min: number; max: number }
): number {
  const n = Number(raw ?? def);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export function parseListQuery(url: URL): ListQuery {
  const q = (url.searchParams.get("q") ?? "").trim() || undefined;

  const page = toClampedInt(url.searchParams.get("page"), {
    def: 1,
    min: 1,
    max: 1_000_000,
  });

  const pageSize = toClampedInt(url.searchParams.get("pageSize"), {
    def: 50,
    min: 1,
    max: 2000,
  });

  const activeOnly = toBool(url.searchParams.get("activeOnly"));
  const raw = toBool(url.searchParams.get("raw"));

  return { q, page, pageSize, activeOnly, raw };
}
