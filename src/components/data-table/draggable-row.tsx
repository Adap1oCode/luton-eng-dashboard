import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";

interface DraggableRowProps<T extends Record<string, unknown>> {
  id: string;
  item: T;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  isExpanded: boolean;
  onExpand: () => void;
  columns: string[];
  visibleColumns: string[];
  renderCell: (columnId: string) => React.ReactNode;
  renderExpandedContent: () => React.ReactNode;
  renderActions: () => React.ReactNode;
}

export function DraggableRow<T extends Record<string, unknown>>({
  id,
  isSelected,
  onSelect,
  isExpanded,
  onExpand,
  columns,
  visibleColumns,
  renderCell,
  renderExpandedContent,
  renderActions,
}: DraggableRowProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <>
      <TableRow
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        className={`hover:bg-muted/50 ${isDragging ? "opacity-50" : ""}`}
        {...attributes}
      >
        <TableCell className="p-3">
          <Checkbox checked={isSelected} onCheckedChange={onSelect} />
        </TableCell>
        <TableCell className="p-3">
          <button onClick={onExpand}>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </TableCell>
        {columns.map((columnId) =>
          visibleColumns.includes(columnId) ? (
            <TableCell key={columnId} className="p-3">
              {renderCell(columnId)}
            </TableCell>
          ) : null,
        )}
        <TableCell className="p-3 text-center">{renderActions()}</TableCell>
        <TableCell className="p-3">
          <GripVertical {...listeners} className="cursor-grab" />
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={columns.length + 4} className="bg-muted p-3">
            {renderExpandedContent()}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
