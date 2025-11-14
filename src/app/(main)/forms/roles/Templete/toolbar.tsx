import React from "react";

import Link from "next/link";

import { Plus, Trash2, Copy, Printer, FileText, Package, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { PermissionGate } from "@/components/auth/permissions-gate";

interface ToolbarProps {
  selectedCount: number;
  hasSorting: boolean;
  onCreateNew: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClearSorting: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedCount,
  hasSorting,
  onCreateNew,
  onDelete,
  onDuplicate,
  onClearSorting,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <PermissionGate any={["screen:roles:create"]}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  New
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={onCreateNew}>Basic Data (Quick Add)</DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/forms/roles/new">Detailed Data</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGate>

          <PermissionGate any={["screen:roles:delete"]}>
            <Button variant="destructive" disabled={selectedCount === 0} onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </PermissionGate>

          <Button variant="outline" disabled={selectedCount === 0} onClick={onDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {hasSorting && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100">
              Sorting Applied
            </Badge>
          )}
          <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-700 dark:text-orange-100">
            Filter/Sorting Applied
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={selectedCount === 0}>
                <Printer className="mr-2 h-4 w-4" />
                Print Report
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" />
                Print Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={selectedCount === 0}>
                <FileText className="mr-2 h-4 w-4" />
                Print Invoice
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" />
                Print Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={selectedCount === 0}>
                <Package className="mr-2 h-4 w-4" />
                Print Packing Slip
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Package className="mr-2 h-4 w-4" />
                Print Packing Slip
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {hasSorting && (
            <Button variant="outline" onClick={onClearSorting}>
              Clear Sorting
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
