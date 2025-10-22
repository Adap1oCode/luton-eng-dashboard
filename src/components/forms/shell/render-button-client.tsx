"use client";

import * as React from "react";

import { ChevronDown, Plus, Download, Layout, Settings, ArrowUpDown, Filter, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { ToolbarButton } from "./toolbar/types";

const ICONS = { Plus, Download, Layout, Settings, ArrowUpDown, Filter, "Delete Selected": Trash2 } as const;

// Small reusable button renderer (supports plain, link, dropdown, and badge chips)
export default function RenderButton({
  button,
  className,
  disabled,
  onClick,
}: {
  button: ToolbarButton;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const Icon = typeof button.icon === "string" ? ICONS[button.icon as keyof typeof ICONS] : undefined;
  const merged = [className].filter(Boolean).join(" ");
  const allowedVariants = ["default", "secondary", "destructive", "outline", "ghost", "link"] as const;
  type AllowedVariant = (typeof allowedVariants)[number];
  const desired = button.variant ?? "default";
  const safeVariant: AllowedVariant = allowedVariants.includes(desired) ? desired : "default";

  // Special handling for chip-style buttons (applied sorting/filtering)
  if (button.id === "appliedSorting" || button.id === "appliedFilters") {
    const chipClassName =
      button.id === "appliedSorting"
        ? "bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-600"
        : "bg-orange-100 text-orange-700 dark:bg-orange-700 dark:text-orange-100 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-600";

    return (
      <Badge
        variant="secondary"
        className={chipClassName}
        onClick={onClick}
        data-onclick-id={button.action || button.onClickId || button.id}
      >
        {button.label}
      </Badge>
    );
  }

  // Optional dropdown menu support
  const menu = button.menu;
  if (menu && menu.items.length) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={safeVariant} className={merged} disabled={!!disabled}>
            {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
            {button.label}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={menu.align ?? "start"}>
          {menu.items.map((it) => {
            const ItemIcon = typeof it.icon === "string" ? ICONS[it.icon as keyof typeof ICONS] : undefined;
            return it.href ? (
              <DropdownMenuItem key={it.id} asChild disabled={it.disabled}>
                <a href={it.href}>
                  {ItemIcon ? <ItemIcon className="mr-2 h-4 w-4" /> : null}
                  {it.label}
                </a>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={it.id} disabled={it.disabled} data-onclick-id={it.action || it.onClickId || it.id}>
                {ItemIcon ? <ItemIcon className="mr-2 h-4 w-4" /> : null}
                {it.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (button.href) {
    return (
      <Button variant={safeVariant} asChild className={merged} disabled={!!disabled}>
        <a href={button.href}>
          {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
          {button.label}
        </a>
      </Button>
    );
  }

  return (
    <Button
      variant={safeVariant}
      className={merged}
      disabled={!!disabled}
      onClick={onClick}
      data-onclick-id={button.action || button.onClickId || button.id}
    >
      {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
      {button.label}
    </Button>
  );
}
