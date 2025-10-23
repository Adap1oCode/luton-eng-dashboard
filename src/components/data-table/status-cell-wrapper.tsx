"use client";

import * as React from "react";

import type { Row } from "@tanstack/react-table";

import { StatusCell } from "@/components/data-table/status-cell";

interface StatusCellWrapperProps<TRow> {
  row: Row<TRow>;
  editingStatus: { rowId: string; value: string } | null;
  onEditStart: (rowId: string, status: string) => void;
  onEditChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const StatusCellWrapper = <TRow extends { id: string }>({
  row,
  editingStatus,
  onEditStart,
  onEditChange,
  onSave,
  onCancel,
}: StatusCellWrapperProps<TRow>) => {
  const rawStatus = row.getValue("status");
  const statusString = typeof rawStatus === "string" ? rawStatus : rawStatus == null ? "" : String(rawStatus);
  const isEditing = editingStatus?.rowId === (row.original as { id: string }).id;

  return (
    <StatusCell
      status={statusString}
      isEditing={isEditing}
      editingStatus={editingStatus?.value ?? statusString}
      statusOptions={["Active", "Inactive", "Pending", "Completed"]}
      onEditStart={() => onEditStart((row.original as { id: string }).id, statusString)}
      onEditChange={onEditChange}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
};
