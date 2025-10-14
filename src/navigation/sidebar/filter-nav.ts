// src/navigation/sidebar/filter-nav.ts
import type { NavGroup, NavMainItem, NavSubItem } from "./sidebar-items";

type Mode = "open-by-default" | "strict";
const DEFAULT_MODE: Mode = "strict"; // flip to "strict" to enforce everywhere

function hasAll(perms: Set<string>, keys?: string[]) {
  if (!keys?.length) return true;
  for (const k of keys) if (!perms.has(k)) return false;
  return true;
}

function hasAny(perms: Set<string>, keys?: string[]) {
  if (!keys?.length) return true;
  for (const k of keys) if (perms.has(k)) return true;
  return false;
}

function passes(
  perms: Set<string>,
  item: { requiredAny?: string[]; requiredAll?: string[] },
  mode: Mode
) {
  const declares = !!(item.requiredAny?.length || item.requiredAll?.length);

  if (mode === "open-by-default") {
    // Only enforce when item declares requirements
    return declares ? hasAny(perms, item.requiredAny) && hasAll(perms, item.requiredAll) : true;
  }

  // strict: require declaration AND satisfaction
  return declares && hasAny(perms, item.requiredAny) && hasAll(perms, item.requiredAll);
}

function filterSubs(
  items: NavSubItem[] | undefined,
  perms: Set<string>,
  mode: Mode,
  hasRole: boolean
): NavSubItem[] | undefined {
  if (!items) return undefined;

  return items
    .map((i) => {
      if (!i) return null;
      // If user has no role/perms, allow only public entries
      if (!hasRole && !i.public) return null;
      if (!passes(perms, i, mode)) return null;

      const sub = filterSubs(i.subItems, perms, mode, hasRole);
      return { ...i, subItems: sub };
    })
    .filter(Boolean) as NavSubItem[];
}

export function filterNavGroups(
  groups: NavGroup[],
  userPermsArray: string[],
  mode: Mode = DEFAULT_MODE
): NavGroup[] {
  const perms = new Set(userPermsArray ?? []);
  const hasRole = perms.size > 0; // treat “valid role” as “has ≥1 effective permission”

  return (groups ?? [])
    .map((g) => {
      if (!g) return null;

      const items = (g.items ?? [])
        .map((i) => {
          if (!i) return null;

          if (!hasRole && !i.public) return null;
          if (!passes(perms, i, mode)) return null;

          const sub = filterSubs(i.subItems, perms, mode, hasRole);

          // Hide empty parents that only act as containers
          if (i.subItems && (!sub || sub.length === 0) && (!i.url || i.url === "#")) return null;

          return { ...i, subItems: sub };
        })
        .filter(Boolean) as NavMainItem[];

      return items.length ? { ...g, items } : null;
    })
    .filter(Boolean) as NavGroup[];
}
