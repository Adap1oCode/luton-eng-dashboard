import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Copy, Printer, Package } from "lucide-react";

type Props = {
  onNew?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onPrintReport?: () => void;
  onPrintInvoice?: () => void;
  onPrintPackingSlip?: () => void;
  disabledDelete?: boolean;
  disabledDuplicate?: boolean;
  className?: string;
};

export default function ActionToolbar({
  onNew,
  onDelete,
  onDuplicate,
  onPrintReport,
  onPrintInvoice,
  onPrintPackingSlip,
  disabledDelete,
  disabledDuplicate,
  className,
}: Props) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className ?? ""}`}>
      <Button onClick={onNew} variant="default">
        <Plus className="mr-2 h-4 w-4" /> New
      </Button>

      <Button onClick={onDelete} variant="destructive" disabled={disabledDelete}>
        <Trash2 className="mr-2 h-4 w-4" /> Delete
      </Button>

      <Button onClick={onDuplicate} variant="secondary" disabled={disabledDuplicate}>
        <Copy className="mr-2 h-4 w-4" /> Duplicate
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Print Report
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onPrintReport}>Summary</DropdownMenuItem>
          <DropdownMenuItem onClick={onPrintReport}>Detail</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Package className="mr-2 h-4 w-4" /> Print Invoice
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onPrintInvoice}>Standard</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Package className="mr-2 h-4 w-4" /> Print Packing Slip
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={onPrintPackingSlip}>Default</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
