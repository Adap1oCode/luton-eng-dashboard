"use client";

import { ReactNode } from "react";

import { Plus, Trash2, Copy, Printer, FileText, Package, ChevronDown, Save, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface DataTableToolbarProps {
  onNew?: () => void;
  onDeleteSelected?: () => void;
  onDuplicateSelected?: () => void;
  onPrintReport?: () => void;
  onPrintInvoice?: () => void;
  onPrintPackingSlip?: () => void;
  onClearSorting?: () => void;
  onExportCSV?: () => void;
  onSaveView?: () => void;

  selectedCount?: number;
  hasSorting?: boolean;
  hasFilters?: boolean;

  leftSlot?: ReactNode;
  middleSlot?: ReactNode;
  rightSlot?: ReactNode;
}

export function DataTableToolbar({
  onNew,
  onDeleteSelected,
  onDuplicateSelected,
  onPrintReport,
  onPrintInvoice,
  onPrintPackingSlip,
  onClearSorting,
  onExportCSV,
  onSaveView,
  selectedCount = 0,
  hasSorting = false,
  hasFilters = false,
  leftSlot,
  middleSlot,
  rightSlot,
}: DataTableToolbarProps) {
  return (
    <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      {/* First row - main actions and badges */}
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {leftSlot ? (
            leftSlot
          ) : (
            <>
              {onNew && (
                <Button onClick={onNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" /> New
                </Button>
              )}
              {onDeleteSelected && (
                <Button variant="destructive" onClick={onDeleteSelected} disabled={selectedCount === 0}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              )}
              {onDuplicateSelected && (
                <Button variant="outline" onClick={onDuplicateSelected} disabled={selectedCount === 0}>
                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {middleSlot}
          {hasSorting && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100">
              Sorting Applied
            </Badge>
          )}
          {hasFilters && (
            <Badge
              variant="secondary"
              className="bg-orange-100 text-orange-700 dark:bg-orange-700 dark:text-orange-100"
            >
              Filter/Sorting Applied
            </Badge>
          )}
        </div>
      </div>

      {/* Second row - print options and save view */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {(onPrintReport || onPrintInvoice || onPrintPackingSlip) && (
            <>
              {onPrintReport && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={selectedCount === 0}>
                      <Printer className="mr-2 h-4 w-4" />
                      Print Report
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={onPrintReport}>
                      <FileText className="mr-2 h-4 w-4" />
                      Print Report
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {onPrintInvoice && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={selectedCount === 0}>
                      <FileText className="mr-2 h-4 w-4" />
                      Print Invoice
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={onPrintInvoice}>
                      <FileText className="mr-2 h-4 w-4" />
                      Print Invoice
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {onPrintPackingSlip && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={selectedCount === 0}>
                      <Package className="mr-2 h-4 w-4" />
                      Print Packing Slip
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={onPrintPackingSlip}>
                      <Package className="mr-2 h-4 w-4" />
                      Print Packing Slip
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
          {onClearSorting && (
            <Button variant="outline" onClick={onClearSorting}>
              Clear Sorting
            </Button>
          )}
          {onExportCSV && (
            <Button
              variant="outline"
              onClick={onExportCSV}
              className="bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>

        {onSaveView && (
          <Button
            variant="outline"
            onClick={onSaveView}
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
          >
            <Save className="mr-2 h-4 w-4" />
            Save View
          </Button>
        )}
        {rightSlot}
      </div>
    </div>
  );
}
