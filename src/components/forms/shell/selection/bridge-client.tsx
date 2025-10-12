"use client";

import { useEffect } from "react";
import { useSelectionStore } from "./selection-store";

type Props = {
  selectedIds: string[];
};

export default function SelectionBridge({ selectedIds }: Props) {
  const setSelectedIds = useSelectionStore((s) => s.setSelectedIds);
  useEffect(() => {
    setSelectedIds(selectedIds ?? []);
  }, [selectedIds, setSelectedIds]);
  return null;
}
