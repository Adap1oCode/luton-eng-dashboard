"use client";

import * as React from "react";

import type { Row } from "@tanstack/react-table";

import { InlineEditCell, type InlineEditConfig } from "@/components/data-table/inline-edit-cell";
import { getDomainId } from "@/components/data-table/view-defaults";

interface InlineEditCellWrapperProps<TRow> {
  row: Row<TRow>;
  columnId: string;
  editingCell: { rowId: string; columnId: string; value: any } | null;
  config: InlineEditConfig;
  onEditStart: (rowId: string, columnId: string, value: any) => void;
  onEditChange: (value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  idField?: string;
}

export const InlineEditCellWrapper = <TRow extends Record<string, any>>({
  row,
  columnId,
  editingCell,
  config,
  onEditStart,
  onEditChange,
  onSave,
  onCancel,
  idField = "id",
}: InlineEditCellWrapperProps<TRow>) => {
  const rawValue = row.getValue(columnId);
  const rowId = getDomainId(row, idField);
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
