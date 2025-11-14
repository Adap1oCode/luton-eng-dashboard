// src/app/(main)/_components/sidebar/nav-user.tsx
"use client";

import { useState, useTransition } from "react";
import { EllipsisVertical, CircleUser, MessageSquareDot, LogOut, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { SwitchUserDialog } from "./switch-user-dialog";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { supabaseBrowser } from "@/lib/supabase";
import { getInitials } from "@/lib/utils";
import { PermissionGate } from "@/components/auth/permissions-gate";

export function NavUser({
  user,
}: {
  readonly user: {
    readonly name: string;
    readonly email?: string; // unused now; kept for future
    readonly role?: string;
    readonly avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [pending, start] = useTransition();

  const handleLogout = () => {
    start(async () => {
      try {
        const supabase = supabaseBrowser();
        
        // Clear impersonation cookie if present
        try {
          await fetch("/api/impersonate", { method: "DELETE" });
        } catch {
          // Ignore errors - cookie may not exist
        }
        
        // Clear localStorage auth-related data
        try {
          localStorage.removeItem("remember_login");
        } catch {
          // Ignore localStorage errors (e.g., private mode)
        }
        
        // Sign out from Supabase (clears session cookies)
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          toast.error("Logout failed", {
            description: error.message,
          });
          return;
        }

        toast.success("Logged out", {
          description: "You have been successfully logged out.",
        });

        // Use window.location.href for hard redirect to ensure all state is cleared
        // This ensures cookies, cache, and React state are fully reset
        window.location.href = "/auth/login";
      } catch (err) {
        toast.error("Logout failed", {
          description: "An unexpected error occurred. Please try again.",
        });
      }
    });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground w-full"
            >
            <Avatar className="h-8 w-8 shrink-0 rounded-lg grayscale">
                <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
              <AvatarFallback className="rounded-lg text-sm">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
                {user.role ? (
                <span className="text-muted-foreground truncate text-xs">{user.role}</span>
                ) : null}
              </div>
            <EllipsisVertical className="ml-auto size-4 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  {user.role ? (
                    <span className="text-muted-foreground truncate text-xs">{user.role}</span>
                  ) : null}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <PermissionGate any={["screen:account:view"]}>
                <DropdownMenuItem>
                  <CircleUser />
                  Account
                </DropdownMenuItem>
              </PermissionGate>
              <PermissionGate any={["screen:notifications:view"]}>
                <DropdownMenuItem>
                  <MessageSquareDot />
                  Notifications
                </DropdownMenuItem>
              </PermissionGate>
              <PermissionGate any={["screen:switch-user:view"]}>
                <DropdownMenuItem onClick={() => setSwitcherOpen(true)}>
                  <ArrowLeftRight />  
                  Switch User
                </DropdownMenuItem>
              </PermissionGate>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleLogout} disabled={pending}>
              <LogOut />
              {pending ? "Logging out..." : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <SwitchUserDialog open={switcherOpen} onOpenChange={setSwitcherOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
