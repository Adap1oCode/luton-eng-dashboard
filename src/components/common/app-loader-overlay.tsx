"use client";

import * as React from "react";

import { useAppLoader } from "@/components/providers/app-loader-provider";

export default function AppLoaderOverlay() {
  const { state } = useAppLoader();

  if (!state.isVisible) {
    return null;
  }

  if (state.variant === "background") {
    return (
      <div className="pointer-events-none fixed top-4 right-4 z-[1100] flex justify-end px-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-lg border bg-card/95 px-4 py-3 shadow-lg">
          <span className="relative inline-flex h-4 w-4">
            <span className="border-primary/30 absolute inset-0 rounded-full border-2" />
            <span className="border-primary absolute inset-0 animate-spin rounded-full border-t-2" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">{state.title}</span>
            {state.message ? <span className="text-xs text-muted-foreground">{state.message}</span> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background/70 fixed inset-0 z-[1100] flex items-center justify-center backdrop-blur-sm">
      <div className="animate-in fade-in flex flex-col items-center gap-4 rounded-lg bg-card/95 px-8 py-6 shadow-lg duration-200">
        <div className="relative">
          <div className="border-primary/30 size-12 rounded-full border-2" />
          <div className="border-primary absolute inset-0 animate-spin rounded-full border-t-2" />
        </div>
        <div className="text-center">
          <div className="text-base font-semibold text-foreground">{state.title}</div>
          {state.message ? (
            <div className="text-sm font-medium text-muted-foreground">{state.message}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
