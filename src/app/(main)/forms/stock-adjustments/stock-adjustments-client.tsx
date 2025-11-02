"use client";

import { ResourceListClient } from "@/components/forms/resource-view/resource-list-client";
import { config } from "./view.config";
import type { StockAdjustmentRow } from "./view.config";
import { toRow } from "./to-row";

interface StockAdjustmentsClientProps {
  initialData: StockAdjustmentRow[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
}

export function StockAdjustmentsClient(props: StockAdjustmentsClientProps) {
  return (
    <ResourceListClient
      title={config.title}
      routeSegment={config.routeSegment}
      apiEndpoint={config.apiEndpoint}
      queryKeyBase="stock-adjustments"
      viewConfig={config.viewConfig}
      toolbar={config.toolbar}
      actions={config.actions}
      quickFilters={config.quickFilters}
      toRow={toRow}
      {...props}
    />
  );
}