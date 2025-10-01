// src/components/data-table/data-table-actions-cell.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Edit, MoreVertical, Star, Trash2 } from "lucide-react";

type Wrapper = "td" | "div";

type Props = {
  onEdit?: () => void;
  onCopy?: () => void;
  onFavorite?: () => void;
  onDelete?: () => void;
  label?: string;
  /** For <td> usage only; ignored when wrapper="div" */
  sticky?: boolean; // default true
  /** Choose how to render the wrapper: "td" for legacy/manual tables, "div" for TanStack cell renderers */
  wrapper?: Wrapper; // default "td"
  /** Extra className to apply on the wrapper */
  className?: string;
};

/**
 * Standardized action menu for table rows.
 * - wrapper="td" (default): use in manually rendered tables (component returns a <td>).
 * - wrapper="div": use inside TanStack cell renderers (component returns a <div>).
 */
export function DataTableActionsCell({
  onEdit,
  onCopy,
  onFavorite,
  onDelete,
  label = "Actions",
  sticky = true,
  wrapper = "td",
  className,
}: Props) {
  const baseTd =
    "w-16 p-2 text-xs font-medium uppercase";
  const stickyTd =
    "sticky right-0 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700";

  const TdOrDiv: any = wrapper; // safe for "td" | "div"

  return (
    <TdOrDiv
      className={[
        wrapper === "td" ? baseTd : "",
        wrapper === "td" && sticky ? stickyTd : "",
        wrapper === "div" ? "flex justify-end" : "",
        className ?? "",
      ].join(" ")}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold">{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {onCopy && (
            <DropdownMenuItem onClick={onCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Make a Copy
            </DropdownMenuItem>
          )}
          {onFavorite && (
            <DropdownMenuItem onClick={onFavorite}>
              <Star className="mr-2 h-4 w-4" />
              Favorite
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-600 dark:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </TdOrDiv>
  );
}
