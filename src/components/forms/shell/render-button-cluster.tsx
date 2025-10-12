"use client";
import RenderButton from "./render-button-client";
import type { ToolbarButton } from "./types";

export function RenderButtonCluster({ buttons }: { buttons: ToolbarButton[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {buttons.map((btn) => (
        <RenderButton key={btn.id} btn={btn} />
      ))}
    </div>
  );
}
