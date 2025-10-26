"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Simplified types for the new approach
export type SimpleDashboardData = {
  summary: Record<string, any>;
  warehouseMetrics: Array<{
    key: string;
    warehouse: string;
    total_available_stock: number;
    total_on_order_quantity: number;
    total_committed_quantity: number;
    out_of_stock_count: number;
    total_on_order_value: number;
    total_inventory_value: number;
    total_committed_value: number;
    missing_cost_count: number;
  }>;
  uomMetrics: Array<{
    key: string;
    uom: string;
    item_count: number;
  }>;
};

export type SimpleDashboardConfig = {
  title: string;
  summaryTiles: Array<{
    key: string;
    title: string;
    subtitle: string;
    value: number;
    format?: 'number' | 'currency' | 'percentage';
  }>;
  charts: Array<{
    key: string;
    title: string;
    type: 'bar' | 'donut';
    data: any[];
    dataKey: string;
    valueKey: string;
  }>;
};

type Props = {
  config: SimpleDashboardConfig;
  data: SimpleDashboardData;
};

export default function SimpleDashboard({ config, data }: Props) {
  const formatValue = (value: number, format?: string) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
      case 'percentage':
        return `${value}%`;
      default:
        return new Intl.NumberFormat('en-GB').format(value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
          <p className="text-muted-foreground">
            Real-time inventory overview and analytics
          </p>
        </div>
      </div>

      {/* Summary Tiles */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {config.summaryTiles.map((tile) => (
          <Card key={tile.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{tile.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatValue(tile.value, tile.format)}
              </div>
              <p className="text-xs text-muted-foreground">{tile.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {config.charts.map((chart) => (
          <Card key={chart.key}>
            <CardHeader>
              <CardTitle>{chart.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {chart.type === 'bar' && (
                <ChartContainer config={{}} className="h-[300px] w-full">
                  <BarChart data={chart.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey={chart.dataKey}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey={chart.valueKey} 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
