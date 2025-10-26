// src/components/data-table/useSavedViews.ts
import { useCallback, useEffect, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc" | "none";
export type SortConfig = {
  column: string | null;
  direction: SortDirection;
  /** semantic type for sorting */
  type?: "alphabetical" | "date" | "status";
};

export type SavedView = {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  columnOrder: string[];
  visibleColumns: Record<string, boolean>;
  sortConfig: SortConfig;
  createdAt: string; // ISO
};

export type ViewSnapshot = Omit<SavedView, "id" | "createdAt">;

const memoryStore = new Map<string, string>();

function getStoreKey(tableId: string) {
  return `datatable:views:${tableId}`;
}

function readStorage(tableId: string): SavedView[] {
  const key = getStoreKey(tableId);
  try {
    const raw =
      typeof window === "undefined" ? memoryStore.get(key) : window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function writeStorage(tableId: string, views: SavedView[]) {
  const key = getStoreKey(tableId);
  const payload = JSON.stringify(views);
  if (typeof window === "undefined") {
    memoryStore.set(key, payload);
  } else {
    window.localStorage.setItem(key, payload);
  }
}

export function useSavedViews(tableId: string, defaultColumnIds: string[]) {
  const [views, setViews] = useState<SavedView[]>(() => {
    // keep local for offline/SSR fallback; remote layer will hydrate
    const existing = readStorage(tableId);
    if (existing.length) return existing;
    const def: SavedView = {
      id: "default",
      name: "Default View",
      description: "All columns visible, no sorting",
      isDefault: true,
      columnOrder: defaultColumnIds,
      visibleColumns: defaultColumnIds.reduce((acc, id) => ((acc[id] = true), acc), {} as Record<string, boolean>),
      sortConfig: { column: null, direction: "none", type: "alphabetical" },
      createdAt: new Date().toISOString(),
    };
    writeStorage(tableId, [def]);
    return [def];
  });

  const [currentViewId, setCurrentViewId] = useState<string>(() => {
    const v = readStorage(tableId);
    const def = v.find((x) => x.isDefault) ?? v[0];
    return def?.id ?? "default";
  });

  useEffect(() => {
    writeStorage(tableId, views);
  }, [tableId, views]);

  const currentView = useMemo(
    () => views.find((v) => v.id === currentViewId) ?? views[0],
    [views, currentViewId]
  );

  const applyView = useCallback(
    (id: string) => {
      const v = views.find((x) => x.id === id);
      if (v) setCurrentViewId(v.id);
      return v;
    },
    [views]
  );

  const saveView = useCallback(
    (payload: ViewSnapshot) => {
      const id = `view-${Date.now()}`;
      const view: SavedView = { ...payload, id, createdAt: new Date().toISOString() };
      setViews((prev) => [...prev, view]);
      setCurrentViewId(id);
      return view;
    },
    []
  );

  const deleteView = useCallback((id: string) => {
    setViews((prev) => prev.filter((v) => v.id !== id || v.isDefault)); // cannot delete default
    if (currentViewId === id) {
      const def = views.find((x) => x.isDefault) ?? views.find((x) => x.id !== id);
      if (def) setCurrentViewId(def.id);
    }
  }, [currentViewId, views]);

  const setDefault = useCallback((id: string) => {
    setViews((prev) =>
      prev.map((v) => ({ ...v, isDefault: v.id === id }))
    );
  }, []);

  const updateView = useCallback((id: string, patch: Partial<ViewSnapshot>) => {
    setViews((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...patch } : v))
    );
  }, []);

  // Remote hydration: optional small helper (call from caller when ready)
  const hydrateFromRemote = useCallback((remoteViews: SavedView[]) => {
    if (!Array.isArray(remoteViews)) return;
    if (remoteViews.length === 0) return; // keep local default
    setViews(remoteViews);
    const def = remoteViews.find((x) => x.isDefault) ?? remoteViews[0];
    if (def) setCurrentViewId(def.id);
  }, []);

  return {
    views,
    currentViewId,
    currentView,
    setCurrentViewId,
    applyView,
    saveView,
    deleteView,
    updateView,
    setDefault,
    hydrateFromRemote,
  };
}
