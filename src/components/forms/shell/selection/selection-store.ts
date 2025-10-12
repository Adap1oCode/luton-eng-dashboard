"use client";

import { create } from "zustand";

type SelectionState = {
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  clear: () => void;
};

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedIds: [],
  setSelectedIds: (ids) => set({ selectedIds: Array.isArray(ids) ? ids : [] }),
  clear: () => set({ selectedIds: [] }),
}));
