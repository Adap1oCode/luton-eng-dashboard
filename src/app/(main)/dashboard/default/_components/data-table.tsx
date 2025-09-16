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
import { Plus } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { DataTable as DataTableNew } from "../../../../../components/data-table/data-table";
import { DataTablePagination } from "../../../../../components/data-table/data-table-pagination";
import { DataTableViewOptions } from "../../../../../components/data-table/data-table-view-options";
import { withDndColumn } from "../../../../../components/data-table/table-utils";

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

export function DataTable({ data: initialData }: { data: z.infer<typeof schema>[] }) {
  const dndEnabled = true;

  const [data, setData] = React.useState(() => initialData);
  const columns = dndEnabled ? withDndColumn(dashboardColumns) : dashboardColumns;

  // New: per-column filters (mode is string to match child component prop types)
  const [filters, setFilters] = React.useState<Record<string, { mode: string; value: string }>>({});

  // Compute filtered data from the original data and active filters
  const filteredData = React.useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, v]) => v.value && v.value.trim() !== "");
    if (activeFilters.length === 0) return data;

    return data.filter((row) => {
      return activeFilters.every(([key, { mode, value }]) => {
        const cell = String((row as any)[key] ?? "").toLowerCase();
        const q = value.toLowerCase();
        switch (mode) {
          case "is":
            return cell === q;
          case "isNot":
            return cell !== q;
          case "contains":
            return cell.includes(q);
          case "notContains":
            return !cell.includes(q);
          case "startsWith":
            return cell.startsWith(q);
          case "endsWith":
            return cell.endsWith(q);
          default:
            return true;
        }
      });
    });
  }, [data, filters]);

  const table = useDataTableInstance({ data: filteredData, columns, getRowId: (row) => row.id.toString() });
  const sortableId = React.useId();
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));
  const dataIds = React.useMemo<UniqueIdentifier[]>(() => filteredData?.map(({ id }) => id) || [], [filteredData]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((currentData) => {
        // Find indices in the original data array so the reorder persists in the main source
        const oldIndex = currentData.findIndex((r) => String((r as any).id) === String(active.id));
        const newIndex = currentData.findIndex((r) => String((r as any).id) === String(over.id));
        if (oldIndex === -1 || newIndex === -1) return currentData;
        return arrayMove(currentData, oldIndex, newIndex);
      });
    }
  }

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
          <DataTableViewOptions table={table} />
          <Button variant="outline" size="sm">
            <Plus />
            <span className="hidden lg:inline">Add Section</span>
          </Button>
        </div>
      </div>
      <TabsContent value="outline" className="relative flex flex-col gap-4 overflow-visible">
        <div className="overflow-visible rounded-lg border">
          {/* Filters moved into DataTable header for perfect alignment */}
          {/* use an any-typed alias so we can pass filters without TS errors */}
          {(() => {
            const Dt: any = DataTableNew as any;
            return (
              <Dt
                dndEnabled={dndEnabled}
                table={table}
                dataIds={dataIds}
                handleDragEnd={handleDragEnd}
                sensors={sensors}
                sortableId={sortableId}
                filters={filters}
                setFilters={setFilters}
              />
            );
          })()}
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
