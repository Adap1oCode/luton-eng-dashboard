"use client";

import { useMemo } from "react";

import { useRouter } from "next/navigation";

import RenderButton from "@/components/forms/shell/render-button-client";

import { useSelectionStore } from "../selection/selection-store";

import { useToolbarActions } from "./actions";
import type { ToolbarButton, ToolbarConfig, ActionConfig } from "./types";

function isEnabled(rule: ToolbarButton["enableWhen"], selectedCount: number) {
  const r = rule ?? "none";
  if (r === "none") return true;
  if (r === "oneSelected") return selectedCount === 1;
  if (r === "anySelected") return selectedCount > 0;
  return true;
}

function Row({
  buttons,
  disabledByRule,
  onHref,
  onAction,
}: {
  buttons?: ToolbarButton[];
  disabledByRule: (b: ToolbarButton) => boolean;
  onHref: (href: string) => void;
  onAction: (action: string) => void;
}) {
  if (!buttons?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {buttons.map((b) => {
        const disabled = disabledByRule(b);
        const onClick = () => {
          if (disabled) return;
          if (b.href) onHref(b.href);
          else if (b.action) onAction(b.action);
        };
        return <RenderButton key={b.id} button={b} disabled={disabled} onClick={onClick} />;
      })}
    </div>
  );
}

export default function ToolbarClient({ config, actions }: { config?: ToolbarConfig; actions?: ActionConfig }) {
  const router = useRouter();
  const selectedCount = useSelectionStore((s) => s.selectedIds.length);
  const runner = useToolbarActions(actions);

  const disabledByRule = useMemo(() => (b: ToolbarButton) => !isEnabled(b.enableWhen, selectedCount), [selectedCount]);

  const onHref = (href: string) => router.push(href);
  const onAction = (action: string) => {
    // try built-ins/generic via `run`
    runner.run(action);
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <Row buttons={config?.primary} disabledByRule={disabledByRule} onHref={onHref} onAction={onAction} />
      <div className="flex items-center justify-between gap-3">
        <Row buttons={config?.left} disabledByRule={disabledByRule} onHref={onHref} onAction={onAction} />
        <Row buttons={config?.right} disabledByRule={disabledByRule} onHref={onHref} onAction={onAction} />
      </div>
      {runner.ConfirmComponent}
    </div>
  );
}
