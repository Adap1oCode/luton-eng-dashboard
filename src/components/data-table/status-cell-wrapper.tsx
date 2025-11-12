"use client";

import * as React from "react";

import type { Row } from "@tanstack/react-table";

import { StatusCell } from "@/components/data-table/status-cell";
import { getDomainId } from "@/components/data-table/view-defaults";

interface StatusCellWrapperProps<TRow> {
  row: Row<TRow>;
  editingStatus: { rowId: string; value: string } | null;
  onEditStart: (rowId: string, status: string) => void;
  onEditChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  idField?: string;
}

export const StatusCellWrapper = <TRow extends Record<string, any>>({
  row,
  editingStatus,
  onEditStart,
  onEditChange,
  onSave,
  onCancel,
  idField = "id",
}: StatusCellWrapperProps<TRow>) => {
  const rawStatus = row.getValue("status");
  const statusString = typeof rawStatus === "string" ? rawStatus : rawStatus == null ? "" : String(rawStatus);
  const rowId = getDomainId(row, idField);
  const isEditing = editingStatus?.rowId === rowId;

  return (
    <StatusCell
      status={statusString}
      isEditing={isEditing}
      editingStatus={editingStatus?.value ?? statusString}
      statusOptions={["Active", "Inactive", "Pending", "Completed"]}
      onEditStart={() => onEditStart(rowId, statusString)}
      onEditChange={onEditChange}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
};
