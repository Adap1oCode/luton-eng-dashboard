"use client";

/**
 * Minimal client wrapper for SSR pattern.
 * Materializes columns in client context and passes to ResourceTableClient.
 * 
 * This is needed because buildColumns() calls makeActionsColumn() which is client-only.
 * We can't pass functions from server to client components in Next.js.
 */
import { useMemo } from "react";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";
import type { BaseViewConfig } from "@/components/data-table/view-defaults";
import type { PermissionRow } from "./permissions.config";
import { permissionsViewConfig } from "./permissions.config";

interface PermissionsTableClientProps {
  initialRows: PermissionRow[];
  initialTotal: number;
  page: number;
  pageSize: number;
}

export function PermissionsTableClient({ initialRows, initialTotal, page, pageSize }: PermissionsTableClientProps) {
  // Materialize columns in client context (where makeActionsColumn() can execute)
  // Memoize to prevent unstable reference that triggers unnecessary recalculations
  const viewConfigWithColumns = useMemo<BaseViewConfig<PermissionRow> & { columns?: any[]; apiEndpoint?: string }>(() => {
    const config = {
      ...permissionsViewConfig,
      columns: permissionsViewConfig.buildColumns?.() ?? [],
      // Explicitly preserve apiEndpoint from viewConfig (VIEW endpoint, not TABLE)
      apiEndpoint: permissionsViewConfig.apiEndpoint,
    };
    // Remove buildColumns function since columns are materialized
    delete (config as any).buildColumns;
    return config;
  }, []);

  // Initial column visibility
  const initialColumnVisibility = useMemo(() => {
    return {
      key: true,
      description: true,
      actions: true,
    };
  }, []);

  return (
    <ResourceTableClient
      config={viewConfigWithColumns}
      initialRows={initialRows}
      initialTotal={initialTotal}
      page={page}
      pageSize={pageSize}
      initialColumnVisibility={initialColumnVisibility}
      showInlineExportButton={false}
    />
  );
}

