// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/constants.ts
// TYPE: Constants
// PURPOSE: Single source of truth for all stock-adjustments constants
// -----------------------------------------------------------------------------

// Constants - Single source of truth
export const ROUTE_SEGMENT = "stock-adjustments" as const;
export const API_ENDPOINT = "/api/v_tcm_user_tally_card_entries" as const;
export const RESOURCE_KEY = "tcm_user_tally_card_entries" as const;
export const PERMISSION_PREFIX = `resource:${RESOURCE_KEY}` as const;
export const RESOURCE_TITLE = "Stock Adjustments" as const;
