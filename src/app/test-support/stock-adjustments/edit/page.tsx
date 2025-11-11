import React from "react";
import { notFound } from "next/navigation";

import StockAdjustmentFormWrapper from "@/app/(main)/forms/stock-adjustments/components/stock-adjustment-form-wrapper";
import { stockAdjustmentCreateConfig } from "@/app/(main)/forms/stock-adjustments/new/form.config";
import { STOCK_ADJUSTMENT_REASON_CODES } from "@/lib/config/stock-adjustment-reason-codes";

const ENTRY_ID = "test-entry";
const FORM_ID = "stock-adjustment-form";

const { submit: _submit, redirectTo: _redirectTo, ...clientConfig } = stockAdjustmentCreateConfig;

const harnessConfig = {
  ...clientConfig,
  submitLabel: "Update",
};

const harnessOptions = {
  reasonCodes: STOCK_ADJUSTMENT_REASON_CODES.map((code) => ({
    id: code.value,
    value: code.value,
    label: code.label,
  })),
  warehouseLocations: [
    { id: "A1", value: "A1", label: "Aisle A1" },
    { id: "A2", value: "A2", label: "Aisle A2" },
    { id: "B1", value: "B1", label: "Bay B1" },
  ],
};

const multiDefaults = {
  id: ENTRY_ID,
  tally_card_number: "TC-PLAYWRIGHT",
  qty: 11,
  location: "A1, A2",
  note: "Harness baseline entry",
  multi_location: true,
  reason_code: "UNSPECIFIED",
  locations: [
    { id: "loc-a", location: "A1", qty: 5, pos: 1 },
    { id: "loc-b", location: "A2", qty: 6, pos: 2 },
  ],
};

const singleDefaults = {
  id: ENTRY_ID,
  tally_card_number: "TC-PLAYWRIGHT",
  qty: 4,
  location: "A1",
  note: "Harness baseline entry",
  multi_location: false,
  reason_code: "UNSPECIFIED",
  locations: [] as Array<{ id: string; location: string; qty: number; pos?: number }>,
};

type HarnessPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function StockAdjustmentEditHarnessPage({ searchParams }: HarnessPageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const modeParam = typeof searchParams?.mode === "string" ? searchParams?.mode : undefined;
  const defaults = modeParam === "single" ? singleDefaults : multiDefaults;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Stock Adjustment Edit Harness</h1>
        <p className="text-muted-foreground">
          Test harness for exercising stock adjustment edit workflows in Playwright.
        </p>
      </div>
      <StockAdjustmentFormWrapper
        formId={FORM_ID}
        config={harnessConfig as any}
        defaults={defaults}
        options={harnessOptions}
        entryId={ENTRY_ID}
        action="/test-support/api/stock-adjustments/save"
        method="POST"
        submitLabel="Save"
      />
    </div>
  );
}

