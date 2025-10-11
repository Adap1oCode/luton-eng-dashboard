// -----------------------------------------------------------------------------
// FILE: src/components/forms/shell/RenderButtonClient.tsx
// TYPE: Client Component
// PURPOSE: Small reusable button renderer (supports plain, link, and dropdown)
// -----------------------------------------------------------------------------

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ToolbarButton = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost";
  href?: string;
  onClickId?: string;
  disabled?: boolean;
  className?: string;
  trailingIcon?: React.ComponentType<{ className?: string }>;
  menu?: {
    align?: "start" | "end";
    items: Array<{
      id: string;
      label: string;
      icon?: React.ComponentType<{ className?: string }>;
      href?: string;
      onClickId?: string;
      disabled?: boolean;
    }>;
  };
};

export default function RenderButton({ btn, className }: { btn: ToolbarButton; className?: string }) {
  const Icon = btn.icon;
  const Trailing = btn.trailingIcon;
  const merged = [className, btn.className].filter(Boolean).join(" ");

  if (btn.menu && btn.menu.items?.length) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={btn.variant ?? "outline"}
            className={merged}
            disabled={btn.disabled}
            data-testid={undefined}
          >
            {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
            {btn.label}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={btn.menu.align ?? "start"}>
          {btn.menu.items.map((it) =>
            it.href ? (
              <DropdownMenuItem key={it.id} asChild disabled={it.disabled}>
                <a href={it.href}>
                  {it.icon ? <it.icon className="mr-2 h-4 w-4" /> : null}
                  {it.label}
                </a>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={it.id} disabled={it.disabled} data-onclick-id={it.onClickId || it.id}>
                {it.icon ? <it.icon className="mr-2 h-4 w-4" /> : null}
                {it.label}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (btn.href) {
    return (
      <Button variant={btn.variant ?? "default"} asChild className={merged} disabled={btn.disabled}>
        <a href={btn.href}>
          {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
          {btn.label}
          {Trailing ? <Trailing className="ml-2 h-4 w-4" /> : null}
        </a>
      </Button>
    );
  }

  return (
    <Button
      variant={btn.variant ?? "default"}
      className={merged}
      disabled={btn.disabled}
      data-onclick-id={btn.onClickId || btn.id}
    >
      {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
      {btn.label}
      {Trailing ? <Trailing className="ml-2 h-4 w-4" /> : null}
    </Button>
  );
}
