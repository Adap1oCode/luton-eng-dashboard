// src/app/(main)/_components/sidebar/app-sidebar.tsx
"use client";

import { Settings, CircleHelp, Search, Database, ClipboardList, File, Command } from "lucide-react";

import { usePermissions } from "@/components/auth/permissions-gate"; // must expose { list: string[] }
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
import { filterNavGroups } from "@/navigation/sidebar/filter-nav";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";

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
  permissions: serverPermissions,
  ...props 
}: React.ComponentProps<typeof Sidebar> & { 
  account?: Account;
  permissions?: string[];
}) {
  // Fallback to existing rootUser shape if no account provided
  const effectiveUser = {
    name: account?.name ?? rootUser.name,
    email: account?.email ?? rootUser.email,
    role: account?.role ?? undefined,
    avatar: account?.avatar ?? rootUser.avatar,
  };

  // Use server-provided permissions if available (SSR), otherwise fall back to client-side fetch
  // This ensures the sidebar loads immediately with server-rendered permissions
  const { list: clientPermissions = [] } = serverPermissions ? { list: [] } : (usePermissions?.() ?? { list: [] });
  const permissions = serverPermissions ?? clientPermissions;
  const filteredNav = filterNavGroups(sidebarItems, permissions); // mode default = open-by-default

  return (
    <Sidebar
      {...props}
      className="border-r"
    >
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="#" className="flex items-center gap-2">
                <Command className="h-5 w-5 shrink-0" />
                <span className="truncate text-base font-semibold">{APP_CONFIG.name}</span>
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
  {/* Removed redundant status line */}
  <NavUser user={effectiveUser} />
</SidebarFooter>
    </Sidebar>
  );
}
