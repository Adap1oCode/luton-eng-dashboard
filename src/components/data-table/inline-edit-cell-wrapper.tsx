"use client";

import * as React from "react";

import type { Row } from "@tanstack/react-table";

import { InlineEditCell, type InlineEditConfig } from "@/components/data-table/inline-edit-cell";

interface InlineEditCellWrapperProps<TRow> {
  row: Row<TRow>;
  columnId: string;
  editingCell: { rowId: string; columnId: string; value: any } | null;
  config: InlineEditConfig;
  onEditStart: (rowId: string, columnId: string, value: any) => void;
  onEditChange: (value: any) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const InlineEditCellWrapper = <TRow extends { id: string }>({
  row,
  columnId,
  editingCell,
  config,
  onEditStart,
  onEditChange,
  onSave,
  onCancel,
}: InlineEditCellWrapperProps<TRow>) => {
  const rawValue = row.getValue(columnId);
  const isEditing = editingCell?.rowId === (row.original as { id: string }).id && editingCell?.columnId === columnId;

  // Wrap in container that preserves column width - prevents flicker during edit transitions
  return (
    <div className="w-full min-w-0 max-w-full">
      <InlineEditCell
        value={rawValue}
        isEditing={isEditing}
        editingValue={editingCell?.value ?? rawValue}
        config={config}
        onEditStart={() => onEditStart((row.original as { id: string }).id, columnId, rawValue)}
        onEditChange={onEditChange}
        onSave={onSave}
        onCancel={onCancel}
      />
    </div>
  );
};
