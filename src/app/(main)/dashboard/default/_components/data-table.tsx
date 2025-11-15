"use client";

import * as React from "react";

import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Plus, Filter } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { withDndColumn } from "@/components/data-table/table-utils";

import { dashboardColumns } from "./columns";

export const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
});

type SchemaType = z.infer<typeof schema>;
type ColumnFilters = Record<string, { value: string; operator: string }>;

// Filter operators component
const FilterOperatorButton = ({
  column,
  operator,
  value,
  onUpdate,
}: {
  column: string;
  operator: string;
  value: string;
  onUpdate: (column: string, value: string, operator: string) => void;
}) => {
  const getOperatorDisplay = (op: string) => {
    switch (op) {
      case "contains":
        return "";
      case "equal":
        return "Eq";
      case "starts_with":
        return "St";
      case "ends_with":
        return "En";
      case "not_equal":
        return "Ne";
      default:
        return "";
    }
  };

  const operators = [
    { value: "contains", label: "Contains" },
    { value: "equal", label: "Equal to" },
    { value: "starts_with", label: "Starts with" },
    { value: "ends_with", label: "Ends with" },
    { value: "not_equal", label: "Not equal" },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-10 px-2 text-xs">
          <Filter className="mr-1 h-3 w-3" />
          {getOperatorDisplay(operator)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1">
        <div className="space-y-1">
          {operators.map((op) => (
            <Button
              key={op.value}
              variant={operator === op.value ? "default" : "ghost"}
              size="sm"
              className="h-7 w-full justify-start text-xs"
              onClick={() => onUpdate(column, value, op.value)}
            >
              {op.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Column filter component
const ColumnFilter = ({
  column,
  label,
  value,
  operator,
  onUpdate,
}: {
  column: string;
  label: string;
  value: string;
  operator: string;
  onUpdate: (column: string, value: string, operator: string) => void;
}) => (
  <div className="space-y-2">
    <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{label}</label>
    <div className="flex gap-2">
      <Input
        placeholder="Filter..."
        value={value}
        onChange={(e) => onUpdate(column, e.target.value, operator)}
        className="h-8 text-xs"
      />
      <FilterOperatorButton column={column} operator={operator} value={value} onUpdate={onUpdate} />
    </div>
  </div>
);

// Filters section component
const FiltersSection = ({
  columnFilters,
  onUpdateFilter,
}: {
  columnFilters: ColumnFilters;
  onUpdateFilter: (column: string, value: string, operator: string) => void;
}) => (
  <div className="bg-muted/50 border-b border-gray-200 p-4 dark:border-gray-700">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <ColumnFilter
        column="header"
        label="Header"
        value={columnFilters.header?.value ?? ""}
        operator={columnFilters.header?.operator ?? "contains"}
        onUpdate={onUpdateFilter}
      />
      <ColumnFilter
        column="type"
        label="Section Type"
        value={columnFilters.type?.value ?? ""}
        operator={columnFilters.type?.operator ?? "contains"}
        onUpdate={onUpdateFilter}
      />
      <ColumnFilter
        column="status"
        label="Status"
        value={columnFilters.status?.value ?? ""}
        operator={columnFilters.status?.operator ?? "contains"}
        onUpdate={onUpdateFilter}
      />
      <ColumnFilter
        column="target"
        label="Target"
        value={columnFilters.target?.value ?? ""}
        operator={columnFilters.target?.operator ?? "equal"}
        onUpdate={onUpdateFilter}
      />
      <ColumnFilter
        column="limit"
        label="Limit"
        value={columnFilters.limit?.value ?? ""}
        operator={columnFilters.limit?.operator ?? "equal"}
        onUpdate={onUpdateFilter}
      />
      <ColumnFilter
        column="reviewer"
        label="Reviewer"
        value={columnFilters.reviewer?.value ?? ""}
        operator={columnFilters.reviewer?.operator ?? "contains"}
        onUpdate={onUpdateFilter}
      />
    </div>
  </div>
);

// Custom hook for data filtering
const useDataFiltering = (data: SchemaType[], columnFilters: ColumnFilters) => {
  return React.useMemo(() => {
    return data.filter((item) => {
      return Object.entries(columnFilters).every(([column, filter]) => {
        if (!filter.value) return true;

        const itemValue = String(item[column as keyof SchemaType]).toLowerCase();
        const filterValue = filter.value.toLowerCase();

        switch (filter.operator) {
          case "equal":
            return itemValue === filterValue;
          case "contains":
            return itemValue.includes(filterValue);
          case "starts_with":
            return itemValue.startsWith(filterValue);
          case "ends_with":
            return itemValue.endsWith(filterValue);
          case "not_equal":
            return itemValue !== filterValue;
          default:
            return itemValue.includes(filterValue);
        }
      });
    });
  }, [data, columnFilters]);
};

// Custom hook for drag and drop
const useDragAndDrop = (setData: React.Dispatch<React.SetStateAction<SchemaType[]>>) => {
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (active && over && active.id !== over.id) {
        setData((currentData) => {
          const oldIndex = currentData.findIndex((r) => String(r.id) === String(active.id));
          const newIndex = currentData.findIndex((r) => String(r.id) === String(over.id));
          if (oldIndex === -1 || newIndex === -1) return currentData;
          return arrayMove(currentData, oldIndex, newIndex);
        });
      }
    },
    [setData],
  );

  return { sensors, handleDragEnd };
};

export function DataTable({ data: initialData }: { data: SchemaType[] }) {
  const dndEnabled = true;
  const [data, setData] = React.useState(() => initialData);
  const [showFilter, setShowFilter] = React.useState(false);

  const [columnFilters, setColumnFilters] = React.useState<ColumnFilters>({
    header: { value: "", operator: "contains" },
    type: { value: "", operator: "contains" },
    status: { value: "", operator: "contains" },
    target: { value: "", operator: "equal" },
    limit: { value: "", operator: "equal" },
    reviewer: { value: "", operator: "contains" },
  });

  const filteredData = useDataFiltering(data, columnFilters);
  const { sensors, handleDragEnd } = useDragAndDrop(setData);

  const columns = dndEnabled ? withDndColumn(dashboardColumns) : dashboardColumns;
  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row) => row.id.toString(),
  });

  const sortableId = React.useId();
  const dataIds = React.useMemo<UniqueIdentifier[]>(() => filteredData?.map(({ id }) => id) ?? [], [filteredData]);

  const updateColumnFilter = React.useCallback((column: string, value: string, operator: string) => {
    setColumnFilters((prev) => ({
      ...prev,
      [column]: { value, operator },
    }));
  }, []);

  return (
    <Tabs defaultValue="outline" className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between">
        <Label htmlFor="view-selector" className="sr-only">
          View
        </Label>
        <Select defaultValue="outline">
          <SelectTrigger className="flex w-fit @4xl/main:hidden" size="sm" id="view-selector">
            <SelectValue placeholder="Select a view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="outline">Outline</SelectItem>
            <SelectItem value="past-performance">Past Performance</SelectItem>
            <SelectItem value="key-personnel">Key Personnel</SelectItem>
            <SelectItem value="focus-documents">Focus Documents</SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="outline">Outline</TabsTrigger>
          <TabsTrigger value="past-performance">
            Past Performance <Badge variant="secondary">3</Badge>
          </TabsTrigger>
          <TabsTrigger value="key-personnel">
            Key Personnel <Badge variant="secondary">2</Badge>
          </TabsTrigger>
          <TabsTrigger value="focus-documents">Focus Documents</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowFilter(!showFilter)}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Show Filter
          </Button>
          <DataTableViewOptions table={table} />
          <Button variant="outline" size="sm">
            <Plus />
            <span className="hidden lg:inline">Add Section</span>
          </Button>
        </div>
      </div>
      <TabsContent value="outline" className="relative flex flex-col gap-4 overflow-visible">
        <div className="overflow-visible rounded-lg border">
          {showFilter && <FiltersSection columnFilters={columnFilters} onUpdateFilter={updateColumnFilter} />}

          <DataTableNew
            dndEnabled={dndEnabled}
            table={table}
            dataIds={dataIds}
            handleDragEnd={handleDragEnd}
            sensors={sensors}
            sortableId={sortableId}
            filters={{}}
          />
        </div>
        <DataTablePagination table={table} />
      </TabsContent>
      <TabsContent value="past-performance" className="flex flex-col">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent value="key-personnel" className="flex flex-col">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
      <TabsContent value="focus-documents" className="flex flex-col">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed"></div>
      </TabsContent>
    </Tabs>
  );
}
