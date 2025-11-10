"use client";

import { useMemo, useState, useCallback } from "react";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import { InventoryInfoDialog } from "@/components/inventory/inventory-info-dialog";

import type { CompareStockRow } from "./compare-stock.config";
import { compareStockViewConfig, buildColumns } from "./compare-stock.config";

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
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [selectedItemNumber, setSelectedItemNumber] = useState<string | number | null>(null);

  const handleItemNumberClick = useCallback((itemNumber: string | number | null) => {
    setSelectedItemNumber(itemNumber);
    setShowInventoryDialog(true);
  }, []);

  const viewConfigWithColumns = useMemo<BaseViewConfig<CompareStockRow> & { columns?: any[]; apiEndpoint?: string }>(() => {
    const config = {
      ...compareStockViewConfig,
      columns: buildColumns(handleItemNumberClick),
      apiEndpoint: compareStockViewConfig.apiEndpoint,
    };
    delete (config as any).buildColumns;
    return config;
  }, [handleItemNumberClick]);

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
    <>
      <ResourceTableClient
        config={viewConfigWithColumns}
        initialRows={initialRows}
        initialTotal={initialTotal}
        page={page}
        pageSize={pageSize}
        initialColumnVisibility={initialColumnVisibility}
      />
      <InventoryInfoDialog
        open={showInventoryDialog}
        onOpenChange={setShowInventoryDialog}
        itemNumber={selectedItemNumber}
      />
    </>
  );
}
