"use client";

import { ResourceListClient } from "@/components/forms/resource-view/resource-list-client";
import { config } from "./view.config";
import type { StockAdjustmentRow } from "./view.config";

interface StockAdjustmentsClientProps {
  initialData: StockAdjustmentRow[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
}

function toRow(d: any): StockAdjustmentRow {
  return {
    id: String(d?.id ?? ""),
    full_name: String(d?.full_name ?? ""),
    warehouse: String(d?.warehouse ?? ""),
    tally_card_number: d?.tally_card_number ?? null,
    qty: d?.qty ?? null,
    location: d?.location ?? null,
    note: d?.note ?? null,
    updated_at: d?.updated_at ?? null,
    updated_at_pretty: d?.updated_at_pretty ?? null,
    is_active: d?.qty !== null && d?.qty !== undefined && Number(d?.qty) > 0,
  };
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