"use client";

import { useMemo } from "react";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";

import type { CompareStockRow } from "./compare-stock.config";
import { compareStockViewConfig } from "./compare-stock.config";

interface CompareStockTableClientProps {
  initialRows: CompareStockRow[];
  initialTotal: number;
  page: number;
  pageSize: number;
}

export function CompareStockTableClient({
  initialRows,
  initialTotal,
  page,
  pageSize,
}: CompareStockTableClientProps) {
  const viewConfigWithColumns = useMemo<BaseViewConfig<CompareStockRow> & { columns?: any[]; apiEndpoint?: string }>(() => {
    const config = {
      ...compareStockViewConfig,
      columns: compareStockViewConfig.buildColumns(),
      apiEndpoint: compareStockViewConfig.apiEndpoint,
    };
    delete (config as any).buildColumns;
    return config;
  }, []);

  const initialColumnVisibility = useMemo(() => {
    return {
      row_key: false,
      tally_card: true,
      item_number: true,
      warehouse: true,
      location: true,
      ims_location: true,
      so_qty: true,
      ims_qty: true,
      qty_diff: true,
      compare_status: true, // Note: column id is "compare_status" not "status"
    };
  }, []);

  return (
    <ResourceTableClient
      config={viewConfigWithColumns}
      initialRows={initialRows}
      initialTotal={initialTotal}
      page={page}
      pageSize={pageSize}
      initialColumnVisibility={initialColumnVisibility}
    />
  );
}
