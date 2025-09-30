"use client";

import { useTransition } from "react";

import { Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SidebarVariant, SidebarCollapsible, ContentLayout } from "@/lib/layout-preferences";

import { setUIPref } from "../../actions"; // ← fixed import

type LayoutControlsProps = {
  readonly variant: SidebarVariant;
  readonly collapsible: SidebarCollapsible;
  readonly contentLayout: ContentLayout;
};

export function LayoutControls({ variant, collapsible, contentLayout }: LayoutControlsProps) {
  const [pending, start] = useTransition();

  // Persist immediately to localStorage for snappy UI, then persist via cookie on the server.
  const persistPref = (key: string, value: string) => {
    // Guard against empty string (ToggleGroup can clear selection)
    if (!value) return;

    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore localStorage failures (e.g., private mode) */
    }

    start(async () => {
      try {
        await setUIPref(key, value);
      } catch {
        /* non-fatal during UI changes; cookie persistence can fail silently in test phase */
      }
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="outline" aria-label="Layout settings" title="Layout settings">
          <Settings />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex flex-col gap-5">
          <div className="space-y-1.5">
            <h4 className="text-sm leading-none font-medium">Layout Settings</h4>
            <p className="text-muted-foreground text-xs">Customize your dashboard layout preferences.</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Sidebar Variant */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Sidebar Variant</Label>
              <ToggleGroup
                className="w-full"
                size="sm"
                variant="outline"
                type="single"
                value={variant}
                onValueChange={(val) => persistPref("sidebar_variant", val)}
                disabled={pending}
              >
                <ToggleGroupItem className="text-xs" value="inset" aria-label="Toggle inset">
                  Inset
                </ToggleGroupItem>
                <ToggleGroupItem className="text-xs" value="sidebar" aria-label="Toggle sidebar">
                  Sidebar
                </ToggleGroupItem>
                <ToggleGroupItem className="text-xs" value="floating" aria-label="Toggle floating">
                  Floating
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Sidebar Collapsible */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Sidebar Collapsible</Label>
              <ToggleGroup
                className="w-full"
                size="sm"
                variant="outline"
                type="single"
                value={collapsible}
                onValueChange={(val) => persistPref("sidebar_collapsible", val)}
                disabled={pending}
              >
                <ToggleGroupItem className="text-xs" value="icon" aria-label="Toggle icon">
                  Icon
                </ToggleGroupItem>
                <ToggleGroupItem className="text-xs" value="offcanvas" aria-label="Toggle offcanvas">
                  OffCanvas
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Content Layout */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Content Layout</Label>
              <ToggleGroup
                className="w-full"
                size="sm"
                variant="outline"
                type="single"
                value={contentLayout}
                onValueChange={(val) => persistPref("content_layout", val)}
                disabled={pending}
              >
                <ToggleGroupItem className="text-xs" value="centered" aria-label="Toggle centered">
                  Centered
                </ToggleGroupItem>
                <ToggleGroupItem className="text-xs" value="full-width" aria-label="Toggle full-width">
                  Full Width
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Optional tiny status hint */}
          {pending && (
            <p className="text-muted-foreground text-[11px]" role="status">
              Saving your preferences…
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
