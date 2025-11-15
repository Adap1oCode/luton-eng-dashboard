// -----------------------------------------------------------------------------
// FILE: src/app/api/debug/nav-filter/route.ts
// PURPOSE: Debug endpoint to see how navigation filtering works
// USAGE: GET /api/debug/nav-filter
// -----------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";

import { filterNavGroups } from "@/navigation/sidebar/filter-nav";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";

export async function GET(_req: NextRequest) {
  try {
    // Get user permissions from the request (you'll need to implement this)
    // For now, let's use the permissions you showed me
    const userPermissions = [
      "admin:impersonate", // Old permission name (backward compatibility)
      "screen:switch-user:update", // New permission name
      "entries:read:any",
      "menu:dashboard",
      "menu:forms:roles",
      "menu:forms:role_warehouse_rules",
      "menu:forms:stock_adjustments",
      "menu:forms:tally_cards",
      "menu:forms:tally_cards_current",
      "menu:forms:users",
      "menu:forms:user_tally_card_entries",
      "menu:forms:warehouses",
      "resource:roles:create",
      "resource:roles:delete",
      "resource:roles:read",
      "resource:roles:update",
      "resource:role_warehouse_rules:create",
      "resource:role_warehouse_rules:delete",
      "resource:role_warehouse_rules:read",
      "resource:role_warehouse_rules:update",
      // Old permission names (backward compatibility)
      "resource:tcm_tally_cards:create",
      "resource:tcm_tally_cards_current:read",
      "resource:tcm_tally_cards:delete",
      "resource:tcm_tally_cards:read",
      "resource:tcm_tally_cards:update",
      "resource:tcm_user_tally_card_entries:create",
      "resource:tcm_user_tally_card_entries:delete",
      "resource:tcm_user_tally_card_entries:read",
      "resource:tcm_user_tally_card_entries:update",
      // New permission names
      "screen:tally-cards:create",
      "screen:tally-cards:delete",
      "screen:tally-cards:read",
      "screen:tally-cards:update",
      "screen:stock-adjustments:create",
      "screen:stock-adjustments:delete",
      "screen:stock-adjustments:read",
      "screen:stock-adjustments:update",
      "resource:users:create",
      "resource:users:delete",
      "resource:users:read",
      "resource:users:update",
      "resource:warehouses:create",
      "resource:warehouses:delete",
      "resource:warehouses:read",
      "resource:warehouses:update"
    ];

    // Test both modes
    const openByDefault = filterNavGroups(sidebarItems, userPermissions, "open-by-default");
    const strict = filterNavGroups(sidebarItems, userPermissions, "strict");

    return NextResponse.json({
      userPermissions,
      totalPermissions: userPermissions.length,
      modes: {
        "open-by-default": {
          groups: openByDefault.length,
          items: openByDefault.reduce((acc, group) => acc + group.items.length, 0),
          details: openByDefault
        },
        "strict": {
          groups: strict.length,
          items: strict.reduce((acc, group) => acc + group.items.length, 0),
          details: strict
        }
      },
      originalSidebarItems: sidebarItems.map(g => ({
        id: g.id,
        label: g.label,
        itemCount: g.items.length,
        items: g.items.map(i => ({
          title: i.title,
          hasPermissionRequirements: !!(i.requiredAny?.length || i.requiredAll?.length),
          requiredAny: i.requiredAny,
          requiredAll: i.requiredAll,
          subItemCount: i.subItems?.length || 0
        }))
      }))
    });

  } catch (error) {
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

