// src/app/(main)/_components/sidebar/app-sidebar.tsx
"use client";

import {
  Settings,
  CircleHelp,
  Search,
  Database,
  ClipboardList,
  File,
  Command,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { rootUser } from "@/data/users";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";
import { filterNavGroups } from "@/navigation/sidebar/filter-nav";
import { usePermissions } from "@/components/auth/permissions-gate"; // must expose { list: string[] }

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

type Account = {
  name: string;
  email: string;
  role?: string;
  avatar?: string;
};

const data = {
  navSecondary: [
    { title: "Settings", url: "#", icon: Settings },
    { title: "Get Help", url: "#", icon: CircleHelp },
    { title: "Search", url: "#", icon: Search },
  ],
  documents: [
    { name: "Data Library", url: "#", icon: Database },
    { name: "Reports", url: "#", icon: ClipboardList },
    { name: "Word Assistant", url: "#", icon: File },
  ],
};

export function AppSidebar({
  account,
  ...props
}: React.ComponentProps<typeof Sidebar> & { account?: Account }) {
  // Fallback to existing rootUser shape if no account provided
  const effectiveUser = {
    name: account?.name ?? rootUser.name,
    email: account?.email ?? rootUser.email,
    avatar: account?.avatar ?? rootUser.avatar,
  };

  // Read current permissions once from context (fed by /api/me/permissions)
  const { list = [] } = usePermissions?.() ?? { list: [] };
  const filteredNav = filterNavGroups(sidebarItems, list); // mode default = open-by-default

  return (
    <Sidebar {...props} className="border-r">
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="#" className="flex items-center gap-2">
                <Command className="h-5 w-5 shrink-0" />
                <span className="truncate text-sm font-semibold sm:text-base">
                  {APP_CONFIG.name}
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto">
        <div className="p-2">
          {/* Use the filtered tree */}
          <NavMain items={filteredNav} />
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        {/* Identity status line (SSR-fed via `account`) */}
        <div className="px-1 pb-1 text-[11px] leading-4 text-muted-foreground">
          <span className="truncate">
            {account?.name ?? "Guest"}
            {account?.role ? <span>{` • ${account.role}`}</span> : null}
          </span>
        </div>

        <NavUser user={effectiveUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
