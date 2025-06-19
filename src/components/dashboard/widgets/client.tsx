"use client";

import { useState, useEffect } from "react";

import { evaluateDataQuality } from "@/components/dashboard/data-quality";
import type { ClientDashboardConfig } from "@/components/dashboard/types";
import ChartAreaInteractive from "@/components/dashboard/widgets/chart-area-interactive";
import ChartByCreator from "@/components/dashboard/widgets/chart-by-creator";
import ChartByProject from "@/components/dashboard/widgets/chart-by-project";
import ChartByStatus from "@/components/dashboard/widgets/chart-by-status";
import ChartMissingData from "@/components/dashboard/widgets/chart-missing-data";
import { DataTable } from "@/components/dashboard/widgets/data-table";
import SectionCards from "@/components/dashboard/widgets/section-cards";

const widgetMap: Record<string, any> = {
  SectionCards,
  ChartAreaInteractive,
  ChartByStatus,
  ChartByCreator,
  ChartByProject,
  ChartMissingData,
};

type Props = {
  config: ClientDashboardConfig;
  metrics: Record<string, any>;
  records: any[];
};

export default function DashboardClient({ config, metrics, records }: Props) {
  const [filters, setFilters] = useState<{ type: string; value: string }[]>([]);

  useEffect(() => {
    console.log("📦 CONFIG:", config);
    console.log("📊 METRICS:", metrics);
    console.log("📁 RECORDS:", records);
  }, [config, metrics, records]);

  const handleFilter = (type: string) => (values: string[]) => {
    const updated = values.map((val) => ({ type, value: val }));
    setFilters(updated);
  };

  const filteredData =
    filters.length === 0
      ? records
      : records.filter((row) =>
          filters.every((f) => {
            if (f.type === "issue") {
              return evaluateDataQuality(row, config.dataQuality ?? []).includes(f.value);
            }
            const field = config.filters[f.type] as string | undefined;
            if (!field) return true;
            return row[field] === f.value;
          }),
        );

  return (
    <div className="grid gap-4">
      {/* Debugging preview of incoming data */}
      <pre className="bg-muted overflow-x-auto rounded-md p-2 text-xs">
        {JSON.stringify(records?.slice(0, 3), null, 2)}
      </pre>

      {config.widgets.map((w, i) => {
        const Comp = widgetMap[w.component];
        if (!Comp) return null;

        const props: any = {};

        if (w.key === "tiles") {
          props.data = config.tiles.map((tile) => ({
            title: tile.title,
            ...metrics?.[tile.key],
          }));
        } else {
          props.data = filteredData;
          if (w.filterType) props.onFilterChange = handleFilter(w.filterType);
        }

        if (w.component === "ChartAreaInteractive") {
          props.widget = w; // ✅ only ChartAreaInteractive receives `widget`
        }

        return <Comp key={i} {...props} />;
      })}

      <DataTable data={filteredData} columns={config.tableColumns} />
    </div>
  );
}
