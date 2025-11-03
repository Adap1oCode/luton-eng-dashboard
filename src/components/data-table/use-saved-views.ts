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
  // Pixel-based column widths
  columnWidthsPx?: Record<string, number>;
  baselineWidthPx?: number;
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
  // ✅ FIX: Start with lightweight defaults, defer localStorage reads to avoid blocking render
  // Helper to create default view (used in initial state and when no saved views exist)
  const createDefaultView = useCallback((): SavedView => ({
    id: "default",
    name: "Default View",
    description: "All columns visible, no sorting",
    isDefault: true,
    columnOrder: defaultColumnIds,
    visibleColumns: defaultColumnIds.reduce((acc, id) => ((acc[id] = true), acc), {} as Record<string, boolean>),
    sortConfig: { column: null, direction: "none", type: "alphabetical" },
    createdAt: new Date().toISOString(),
  }), [defaultColumnIds]);

  // Start with default view - non-blocking initial state (no localStorage read)
  // Use lazy initializer to call createDefaultView only once
  const [views, setViews] = useState<SavedView[]>(() => {
    const defaultView: SavedView = {
      id: "default",
      name: "Default View",
      description: "All columns visible, no sorting",
      isDefault: true,
      columnOrder: defaultColumnIds,
      visibleColumns: defaultColumnIds.reduce((acc, id) => ((acc[id] = true), acc), {} as Record<string, boolean>),
      sortConfig: { column: null, direction: "none", type: "alphabetical" },
      createdAt: new Date().toISOString(),
    };
    return [defaultView];
  });
  const [currentViewId, setCurrentViewId] = useState<string>("default");

  // Load saved views from localStorage asynchronously (non-blocking)
  useEffect(() => {
    const existing = readStorage(tableId);
    if (existing.length > 0) {
      setViews(existing);
      const def = existing.find((x) => x.isDefault) ?? existing[0];
      setCurrentViewId(def?.id ?? "default");
    } else {
      // No saved views - persist default view using memoized function
      writeStorage(tableId, [createDefaultView()]);
    }
  }, [tableId, createDefaultView]);

  // Defer localStorage writes to avoid blocking main thread
  // Use requestIdleCallback if available, otherwise setTimeout as fallback
  useEffect(() => {
    // Batch writes by deferring them slightly - prevents rapid-fire writes during state updates
    let writeTimer: ReturnType<typeof requestIdleCallback> | ReturnType<typeof setTimeout>;
    
    if (typeof requestIdleCallback !== "undefined") {
      writeTimer = requestIdleCallback(() => writeStorage(tableId, views), { timeout: 1000 });
    } else {
      writeTimer = setTimeout(() => writeStorage(tableId, views), 0);
    }
    
    return () => {
      if (typeof requestIdleCallback !== "undefined") {
        cancelIdleCallback(writeTimer as ReturnType<typeof requestIdleCallback>);
      } else {
        clearTimeout(writeTimer as ReturnType<typeof setTimeout>);
      }
    };
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
