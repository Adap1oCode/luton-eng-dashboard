"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PlusCircleIcon, MailIcon, ChevronRight, LogIn, UserPlus, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { type NavGroup, type NavMainItem } from "@/navigation/sidebar/sidebar-items";

interface NavMainProps {
  readonly items: readonly NavGroup[];
}

const IsComingSoon = () => (
  <span className="ml-auto rounded-md bg-gray-200 px-2 py-1 text-xs dark:text-gray-800">Soon</span>
);

// أيقونات افتراضية لعناوين بدون أيقونات في البيانات
const getFallbackIconByTitle = (title: string): LucideIcon | undefined => {
  const t = title.toLowerCase();
  if (t.includes("login")) return LogIn;
  if (t.includes("register")) return UserPlus;
  return undefined;
};

const NavItemExpanded = ({
  item,
  isActive,
  isSubmenuOpen,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  isSubmenuOpen: (subItems?: NavMainItem["subItems"]) => boolean;
}) => {
  // استخدم أيقونة من البيانات أو أيقونة افتراضية حسب العنوان
  const ItemIcon = item.icon ?? getFallbackIconByTitle(item.title);

  return (
    <Collapsible key={item.title} asChild defaultOpen={isSubmenuOpen(item.subItems)} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          {item.subItems ? (
            <SidebarMenuButton
              disabled={item.comingSoon}
              isActive={isActive(item.url, item.subItems)}
              tooltip={item.title}
            >
              {ItemIcon && <ItemIcon />}
              <span>{item.title}</span>
              {item.comingSoon && <IsComingSoon />}
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton
              asChild
              aria-disabled={item.comingSoon}
              isActive={isActive(item.url)}
              tooltip={item.title}
            >
              <Link href={item.url} target={item.newTab ? "_blank" : undefined}>
                {ItemIcon && <ItemIcon />}
                <span>{item.title}</span>
                {item.comingSoon && <IsComingSoon />}
              </Link>
            </SidebarMenuButton>
          )}
        </CollapsibleTrigger>
        {item.subItems && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.subItems.map((subItem) => {
                const SubIcon = subItem.icon ?? getFallbackIconByTitle(subItem.title);
                return (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton aria-disabled={subItem.comingSoon} isActive={isActive(subItem.url)} asChild>
                      <Link href={subItem.url} target={subItem.newTab ? "_blank" : undefined}>
                        {SubIcon && <SubIcon />}
                        <span>{subItem.title}</span>
                        {subItem.comingSoon && <IsComingSoon />}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
};

const NavItemCollapsed = ({
  item,
  isActive,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
}) => {
  const ItemIcon = item.icon ?? getFallbackIconByTitle(item.title);

  return (
    <SidebarMenuItem key={item.title}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            disabled={item.comingSoon}
            tooltip={item.title}
            isActive={isActive(item.url, item.subItems)}
          >
            {ItemIcon && <ItemIcon />}
            <span>{item.title}</span>
            <ChevronRight />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-50 space-y-1" side="right" align="start">
          {item.subItems?.map((subItem) => {
            const SubIcon = subItem.icon ?? getFallbackIconByTitle(subItem.title);
            return (
              <DropdownMenuItem key={subItem.title} asChild>
                <SidebarMenuSubButton
                  key={subItem.title}
                  asChild
                  className="focus-visible:ring-0"
                  aria-disabled={subItem.comingSoon}
                  isActive={isActive(subItem.url)}
                >
                  <Link href={subItem.url} target={subItem.newTab ? "_blank" : undefined}>
                    {SubIcon && <SubIcon />}
                    <span>{subItem.title}</span>
                    {subItem.comingSoon && <IsComingSoon />}
                  </Link>
                </SidebarMenuSubButton>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export function NavMain({ items }: NavMainProps) {
  const path = usePathname();
  const { state, isMobile } = useSidebar();

  const isItemActive = (url: string, subItems?: NavMainItem["subItems"]) => {
    if (subItems?.length) {
      return subItems.some((sub) => path.startsWith(sub.url));
    }
    return path === url;
  };

  const isSubmenuOpen = (subItems?: NavMainItem["subItems"]) => {
    return subItems?.some((sub) => path.startsWith(sub.url)) ?? false;
  };

  return (
    <>
      {/* عنوان شكلي أعلى القائمة زي الصورة */}
      <SidebarGroup>
        <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
      </SidebarGroup>

      {/* بلوك Quick Create يرجع لاستايله القديم ومطابقة لون الأيقونة للنص */}
      <SidebarGroup>
        <SidebarGroupContent className="flex flex-col gap-2">
          <SidebarMenu>
            <SidebarMenuItem className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <SidebarMenuButton
                tooltip="Quick Create"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
              >
                <PlusCircleIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">Quick Create</span>
              </SidebarMenuButton>
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 group-data-[collapsible=icon]:opacity-0"
                variant="outline"
              >
                <MailIcon className="h-4 w-4" />
                <span className="sr-only">Inbox</span>
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {items.map((group) => (
        <SidebarGroup key={group.id}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {group.items.map((item) =>
                state === "collapsed" && !isMobile ? (
                  <NavItemCollapsed key={item.title} item={item} isActive={isItemActive} />
                ) : (
                  <NavItemExpanded key={item.title} item={item} isActive={isItemActive} isSubmenuOpen={isSubmenuOpen} />
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
