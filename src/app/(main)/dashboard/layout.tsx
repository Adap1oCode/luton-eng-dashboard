// src/app/(main)/dashboard/layout.tsx
import { ReactNode } from "react";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MoreHorizontal, Search } from "lucide-react";

import { AppSidebar } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { DataViewerButton } from "@/app/(main)/dashboard/_components/sidebar/data-viewer-button";
import { LayoutControls } from "@/app/(main)/dashboard/_components/sidebar/layout-controls";
import { SearchDialog } from "@/app/(main)/dashboard/_components/sidebar/search-dialog";
import { ThemeSwitcher } from "@/app/(main)/dashboard/_components/sidebar/theme-switcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getSidebarVariant, getSidebarCollapsible, getContentLayout } from "@/lib/layout-preferences";
import { supabaseServer } from "@/lib/supabase-server";
import { cn } from "@/lib/utils";

// ensure this auth check runs on every request (no static cache)
export const dynamic = "force-dynamic";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  // 🔐 Auth guard (server-side)
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Note: browser URL is /dashboard (group "(main)" is not in the URL)
    redirect("/(main)/auth/v1/login");
  }

  // 🧁 Your existing cookie-driven UI prefs
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  const sidebarVariant = await getSidebarVariant();
  const sidebarCollapsible = await getSidebarCollapsible();
  const contentLayout = await getContentLayout();

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar variant={sidebarVariant} collapsible={sidebarCollapsible} />
      <SidebarInset
        className={cn(
          contentLayout === "centered" && "!mx-auto max-w-screen-2xl",
          "min-w-0 flex-1",
          "max-[113rem]:peer-data-[variant=inset]:!mr-2 min-[101rem]:peer-data-[variant=inset]:peer-data-[state=collapsed]:!mr-auto",
        )}
      >
        <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full items-center justify-between px-2 sm:px-4 lg:px-6">
            <div className="flex items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4 sm:mx-2" />
              <div className="hidden sm:block">
                <SearchDialog />
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden items-center gap-2 md:flex">
                <LayoutControls
                  contentLayout={contentLayout}
                  variant={sidebarVariant}
                  collapsible={sidebarCollapsible}
                />
                <ThemeSwitcher />
              </div>
              <div className="flex md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <div className="flex items-center gap-2 p-2">
                        <Search className="h-4 w-4" />
                        <span>search</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <div className="p-2">
                        <ThemeSwitcher />
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <DataViewerButton />
            </div>
          </div>
        </header>
        <div className="p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
