// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/page.tsx
// TYPE: Server Component (thin wrapper)
// PURPOSE: Declare endpoint + columns; generic SSR wrapper does the rest.
// -----------------------------------------------------------------------------
import ResourceSSRPage from "@/components/forms/resource-view/resource-ssr-page";
import { stockAdjustmentsViewConfig } from "./view.config";
import {
  stockAdjustmentsToolbar,
  stockAdjustmentsChips,
  stockAdjustmentsActions,
} from "./toolbar.config";

export default function Page(props: { searchParams?: any }) {
  return (
    <ResourceSSRPage
      title="Compare Stock Adjustments"
      endpoint="/api/v_tcm_tally_card_entry_compare"
      config={stockAdjustmentsViewConfig}
      toolbar={stockAdjustmentsToolbar}
      chips={stockAdjustmentsChips}
      actions={stockAdjustmentsActions}
      searchParams={props.searchParams}
      defaultPageSize={50}
      maxPageSize={500}
    />
  );
}
