// src/app/(main)/layout.tsx
import { ReactNode } from "react";

// keep both: you use headers() to compute baseUrl
import { cookies, headers } from "next/headers";

import { MoreHorizontal, Search } from "lucide-react";

import { AppSidebar } from "@/app/(main)/_components/sidebar/app-sidebar";
import { DataViewerButton } from "@/app/(main)/_components/sidebar/data-viewer-button";
import { LayoutControls } from "@/app/(main)/_components/sidebar/layout-controls";
import { SearchDialog } from "@/app/(main)/_components/sidebar/search-dialog";
import { ThemeSwitcher } from "@/app/(main)/_components/sidebar/theme-switcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NoticeProvider } from "@/components/ui/notice";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryProvider } from "@/components/providers/query-provider";
import { getSidebarVariant, getSidebarCollapsible, getContentLayout } from "@/lib/layout-preferences";
import { cn } from "@/lib/utils";
// ✅ Add this import to keep your intended button

// ensure this runs on every request (no static cache)
export const dynamic = "force-dynamic";

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  // 🧠 Use effective session context (handles impersonation)
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const baseUrl = `${proto}://${host}`;

  // Forward the user's cookies to the API route
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const sessionRes = await fetch(`${baseUrl}/api/me/role`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });

  const session = sessionRes.ok
    ? ((await sessionRes.json()) as {
        fullName?: string | null;
        email?: string | null;
        roleName?: string | null;
        avatarUrl?: string | null;
      })
    : {};

  const displayName = session.fullName ?? session.email ?? "User";
  const email = session.email ?? "";
  const role = session.roleName ?? undefined;

  // 🧁 UI prefs
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const sidebarVariant = await getSidebarVariant();
  const sidebarCollapsible = await getSidebarCollapsible();
  const contentLayout = await getContentLayout();

  return (
    <QueryProvider>
      {/* Mount once so any client component can open the Notice dialog */}
      <NoticeProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar
            variant={sidebarVariant}
            collapsible={sidebarCollapsible}
            account={{ name: displayName, email, role, avatar: session.avatarUrl ?? "" }}
          />
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
                        <Button variant="ghost" size="icon" aria-label="More">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <div className="flex items-center gap-2 p-2">
                            <Search className="h-4 w-4" />
                            <span>Search</span>
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
      </NoticeProvider>
    </QueryProvider>
  );
}
