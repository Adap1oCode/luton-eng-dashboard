"use client";

import * as React from "react";

import type { Row } from "@tanstack/react-table";

import { InlineEditCell, type InlineEditConfig } from "@/components/data-table/inline-edit-cell";

interface InlineEditCellWrapperProps<TRow> {
  row: Row<TRow>;
  rowId: string;
  columnId: string;
  editingCell: { rowId: string; columnId: string; value: any } | null;
  config: InlineEditConfig;
  onEditStart: (rowId: string, columnId: string, value: any) => void;
  onEditChange: (value: any) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const InlineEditCellWrapper = <TRow,>({
  row,
  rowId,
  columnId,
  editingCell,
  config,
  onEditStart,
  onEditChange,
  onSave,
  onCancel,
}: InlineEditCellWrapperProps<TRow>) => {
  const rawValue = row.getValue(columnId);
  const isEditing = editingCell?.rowId === rowId && editingCell?.columnId === columnId;

  // Wrap in container that preserves column width - prevents flicker during edit transitions
  return (
    <div className="w-full min-w-0 max-w-full">
      <InlineEditCell
        value={rawValue}
        isEditing={isEditing}
        editingValue={editingCell?.value ?? ""}
        config={config}
        onEditStart={() => onEditStart(rowId, columnId, rawValue)}
        onEditChange={onEditChange}
        onSave={onSave}
        onCancel={onCancel}
      />
    </div>
  );
};
