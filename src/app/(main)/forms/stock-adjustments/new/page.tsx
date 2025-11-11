import React from "react";

import FormShell from "@/components/forms/shell/form-shell";
import { PermissionGate } from "@/components/auth/permissions-gate";
import { ensureSections, getAllFields } from "@/lib/forms/config-normalize";
import { buildDefaults } from "@/lib/forms/schema";
import { extractOptionsKeys } from "@/lib/forms/extract-options-keys";
import { loadOptions } from "@/lib/forms/load-options";
import StockAdjustmentFormWrapper from "../components/stock-adjustment-form-wrapper";

import { stockAdjustmentCreateConfig } from "./form.config";

export default async function NewStockAdjustmentPage() {
  const cfg = ensureSections(stockAdjustmentCreateConfig);
  const defaults = buildDefaults({ ...cfg, fields: getAllFields(cfg) } as any);

  // Strip non-serializable functions before passing to the client
  const { submit: _submit, redirectTo: _redirectTo, ...clientConfig } = cfg as any;

  // Provide explicit transport so the client never needs functions
  const transportConfig = {
    ...clientConfig,
    method: "POST" as const,
    action: `/api/forms/${clientConfig.key}`,
  };

  const formId = "stock-adjustment-form";
  const isDev = process.env.NODE_ENV !== "production";

  // Extract optionsKeys from form config and load options server-side
  const optionsKeys = extractOptionsKeys(stockAdjustmentCreateConfig);
  
  // Get warehouse_id from tally card to filter locations (if tally_card_number is pre-filled)
  let warehouseId: string | undefined;
  const tallyCardNumber = defaults.tally_card_number;
  if (tallyCardNumber) {
    try {
      const { createClient } = await import("@/lib/supabase-server");
      const sb = await createClient();
      
      // Fetch warehouse_id from tally_cards table
      const { data: tallyCard } = await sb
        .from("tcm_tally_cards")
        .select("warehouse_id")
        .eq("tally_card_number", tallyCardNumber)
        .maybeSingle();
      
      if (tallyCard?.warehouse_id) {
        warehouseId = String(tallyCard.warehouse_id);
        if (isDev) {
          console.log("[NewStockAdjustmentPage] Found warehouse_id for filtering locations:", warehouseId);
        }
      }
    } catch (err) {
      if (isDev) {
        console.warn("[NewStockAdjustmentPage] Failed to fetch warehouse_id for location filtering:", err);
      }
    }
  }
  
  // Load options with warehouse filter for locations (if warehouse_id is available)
  const dynamicFilters = warehouseId 
    ? { warehouseLocations: { warehouse_id: warehouseId } }
    : undefined;
  const loadedOptions = await loadOptions(optionsKeys, undefined, dynamicFilters);

  // Ensure defaults include locations array
  if (!defaults.locations) {
    defaults.locations = [];
  }

  // Return server-rendered shell with client form island
  // Note: in Next.js App Router, this async component can directly return JSX
  return (
    <FormShell
      title={cfg.title}
      headerTitle={cfg.title}
      headerDescription={cfg.subtitle}
      actions={{
        secondaryLeft: (
          <button type="button" className="inline-flex items-center rounded-md border px-4 py-2 text-sm">
            Cancel
          </button>
        ),
        primary: (
          <PermissionGate any={["resource:tcm_user_tally_card_entries:create"]}>
            <button
              form={formId}
              type="submit"
              className="inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-700"
            >
              {cfg.submitLabel ?? "Save"}
            </button>
          </PermissionGate>
        ),
      }}
    >
      <StockAdjustmentFormWrapper
        formId={formId}
        config={transportConfig}
        defaults={defaults}
        options={loadedOptions}
        action={transportConfig.action}
        method={transportConfig.method as "POST" | "PATCH"}
        submitLabel={transportConfig.submitLabel}
      />
    </FormShell>
  );
}
