// src/app/(main)/_components/sidebar/nav-user.tsx
"use client";

import { useState, useTransition } from "react";
import { EllipsisVertical, CircleUser, CreditCard, MessageSquareDot, LogOut, ArrowLeftRight } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const handleLogout = () => {
    start(async () => {
      try {
        const supabase = supabaseBrowser();
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

        // Redirect to login page
        router.push("/auth/login");
        router.refresh(); // Force a refresh to clear any cached data
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
              <DropdownMenuItem>
                <CircleUser />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MessageSquareDot />
                Notifications
              </DropdownMenuItem>

              {/* Impersonation dialog */}
              <DropdownMenuItem onClick={() => setSwitcherOpen(true)}>
              <ArrowLeftRight />  
                Switch User
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleLogout} disabled={pending}>
              <LogOut />
              {pending ? "Logging out..." : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Impersonation dialog (admin-gated by API) */}
        <SwitchUserDialog open={switcherOpen} onOpenChange={setSwitcherOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
