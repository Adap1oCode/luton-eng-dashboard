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
import type { UserRow } from "./users.config";
import { usersViewConfig } from "./users.config";

interface UsersTableClientProps {
  initialRows: UserRow[];
  initialTotal: number;
  page: number;
  pageSize: number;
}

export function UsersTableClient({
  initialRows,
  initialTotal,
  page,
  pageSize,
}: UsersTableClientProps) {
  // Materialize columns in client context (where makeActionsColumn() can execute)
  // Memoize to prevent unstable reference that triggers unnecessary recalculations
  const viewConfigWithColumns = useMemo<BaseViewConfig<UserRow> & { columns?: any[]; apiEndpoint?: string }>(() => {
    const config = {
      ...usersViewConfig,
      columns: usersViewConfig.buildColumns?.() ?? [],
      // Explicitly preserve apiEndpoint from viewConfig (VIEW endpoint, not TABLE)
      apiEndpoint: usersViewConfig.apiEndpoint,
    };
    // Remove buildColumns function since columns are materialized
    delete (config as any).buildColumns;
    return config;
  }, []);

  // Initial column visibility: hide routing id
  const initialColumnVisibility = useMemo(() => {
    return {
      id: false, // Always hide routing id
      name: true,
      email: true,
      role: true,
      created_at: true,
      active: true,
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

