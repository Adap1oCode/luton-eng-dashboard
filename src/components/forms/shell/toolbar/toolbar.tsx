// Server component wrapper for ToolbarClient
import ToolbarClient from "./toolbar-client";
import type { ToolbarConfig, ActionConfig } from "./types";

export default function Toolbar({
  config,
  actions,
}: {
  config?: ToolbarConfig;
  actions?: ActionConfig;
}) {
  if (!config || (!config.primary?.length && !config.left?.length && !config.right?.length)) {
    return null;
  }
  return <ToolbarClient config={config} actions={actions} />;
}
