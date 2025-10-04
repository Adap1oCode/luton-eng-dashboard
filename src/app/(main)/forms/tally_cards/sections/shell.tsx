// -----------------------------------------------------------------------------
// shell.tsx  (Tally Cards screen shell)
// Server Component: renders the Roles-style chrome 1:1 and hosts the table island.
// - Uses the same Tailwind classes as Roles (no visual drift).
// - Emits data-* attributes so your client-side table/menus can hook in.
// - Table/content is passed via `children` (must come from components/data-table/*).
// -----------------------------------------------------------------------------

import * as React from "react";
import ResourceList, { type ToolbarButton } from "@/components/resource-list/resource-list";
import { RenderButton as ShellRenderButton } from "./shell-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Layout, Settings, ArrowUpDown, Filter } from "lucide-react";

type ShellProps = {
  // optional count badge near title
  count?: number;

  // top action rows (same semantics/variants as Roles)
  primaryButtons?: ToolbarButton[]; // e.g. New / Delete / Duplicate
  leftButtons?: ToolbarButton[];    // e.g. Print Report / Invoice / Packing Slip
  rightButtons?: ToolbarButton[];   // e.g. Clear Sorting / Save View / Export CSV

  // chips on the right of the first block
  showFilterChip?: boolean;
  showSortingChip?: boolean;

  // quick filters lane (e.g., Status: All/Active/Inactive)
  quickFiltersSlot?: React.ReactNode;

  // the table island (must use components/data-table/*)
  children: React.ReactNode;

  // footer slot (selected count, rows/page, pagination)
  footerSlot?: React.ReactNode;
};

export default function Shell(props: ShellProps) {
  const {
    count,
    primaryButtons,
    leftButtons,
    rightButtons,
    showFilterChip,
    showSortingChip,
    quickFiltersSlot,
    children,
    footerSlot,
  } = props;

  // Toolbar-left matches Roles: Views / Columns / Sort / More Filters
  const toolbarLeft = (
    <>
      <Button variant="outline" className="flex items-center gap-2" data-toolbar-id="views">
        <Layout className="h-4 w-4" />
        Views
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Button variant="outline" className="flex items-center gap-2" data-toolbar-id="columns">
        <Settings className="h-4 w-4" />
        Columns
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Button variant="outline" className="flex items-center gap-2" data-toolbar-id="sort">
        <ArrowUpDown className="h-4 w-4" />
        Sort
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Button variant="outline" className="flex items-center gap-2" data-toolbar-id="moreFilters">
        <Filter className="h-4 w-4" />
        More Filters
        <ChevronDown className="h-4 w-4" />
      </Button>
    </>
  );

  // Toolbar-right is driven by your screen-specific buttons (Save View / Export CSV, etc.)
const toolbarRight = (
    <>
      {rightButtons?.map((b) => (
        <ShellRenderButton key={b.id} btn={b as any} />
      ))}
    </>
  );

  return (
    <ResourceList
      title="Tally Cards"
      count={typeof count === "number" ? count : undefined}
      primaryButtons={primaryButtons}
      leftButtons={leftButtons}
      rightButtons={rightButtons}
      showFilterChip={showFilterChip}
      showSortingChip={showSortingChip}
      toolbarLeft={toolbarLeft}
      toolbarRight={toolbarRight}
      quickFiltersSlot={quickFiltersSlot}
      footerSlot={footerSlot}
    >
      {children}
    </ResourceList>
  );
}

/**
 * NOTE:
 * - This file is intentionally server-only (no "use client").
 * - Buttons in the toolbar include data-toolbar-id attributes:
 *     "views" | "columns" | "sort" | "moreFilters"
 *   Your client table/menus can listen for clicks via event delegation and open the appropriate UI.
 * - For parity with Roles, keep button variants/spacing/icons exactly as above.
 * - Pass your DataTable island & footer controls from the page file unchanged for now.
 */
