#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple CLI for generating resource pages
function generateResourcePage() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log(`
Usage: node scripts/generate-resource-page.js <resource> <title> <fields>

Example:
  node scripts/generate-resource-page.js users "User Management" "id,name,email,role,created_at"

Arguments:
  resource: The resource name (e.g., users, products, orders)
  title: The page title (e.g., "User Management")
  fields: Comma-separated field names (e.g., "id,name,email,role,created_at")
`);
    process.exit(1);
  }

  const [resource, title, fieldsString] = args;
  const fields = fieldsString.split(',').map(field => ({
    key: field.trim(),
    label: field.trim().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: inferFieldType(field.trim()),
    sortable: true,
    filterable: true,
  }));

  const config = {
    resource,
    title,
    fields,
    features: {
      rowSelection: true,
      pagination: true,
      sorting: true,
      filtering: true,
      inlineEditing: false,
    }
  };

  // Generate the page content
  const pageContent = generatePageContent(config);
  const configContent = generateConfigContent(config);

  // Create directory structure
  const pageDir = path.join('src', 'app', '(main)', 'forms', resource);
  const configFile = path.join(pageDir, `${resource}.config.tsx`);
  const pageFile = path.join(pageDir, 'page.tsx');

  // Ensure directory exists
  if (!fs.existsSync(pageDir)) {
    fs.mkdirSync(pageDir, { recursive: true });
  }

  // Write files
  fs.writeFileSync(configFile, configContent);
  fs.writeFileSync(pageFile, pageContent);

  console.log(`✅ Generated resource page for ${title}`);
  console.log(`📁 Files created:`);
  console.log(`   - ${pageFile}`);
  console.log(`   - ${configFile}`);
  console.log(`\n🚀 Your new page is ready at: /forms/${resource}`);
}

// Infer field type from field name
function inferFieldType(fieldName) {
  const lower = fieldName.toLowerCase();
  
  if (lower.includes('date') || lower.includes('time') || lower.includes('_at')) {
    return 'date';
  }
  if (lower.includes('email')) {
    return 'text';
  }
  if (lower.includes('status') || lower.includes('state')) {
    return 'status';
  }
  if (lower.includes('count') || lower.includes('amount') || lower.includes('price')) {
    return 'number';
  }
  if (lower.includes('is_') || lower.includes('has_') || lower.includes('active')) {
    return 'boolean';
  }
  
  return 'text';
}

// Generate page content (simplified version)
function generatePageContent(config) {
  const { resource, title, fields } = config;
  
  return `// Auto-generated page for ${title}
import type { Metadata } from "next";
import PageShell from "@/components/forms/shell/page-shell";
import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parsePagination, type SPRecord } from "@/lib/next/search-params";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";

// Generated configuration
import { config } from "./${resource}.config";

export const metadata: Metadata = {
  title: "${title}",
};

function toRow(d: any) {
  return {
    ${fields.map(field => `${field.key}: d?.${field.key} ?? null`).join(',\n    ')}
  };
}

export default async function Page(props: { searchParams?: Promise<SPRecord> | SPRecord }) {
  const sp = await resolveSearchParams(props.searchParams);
  const { page, pageSize } = parsePagination(sp, { defaultPage: 1, defaultPageSize: 10, max: 500 });

  const { rows: domainRows, total } = await fetchResourcePage<any>({
    endpoint: "/api/${resource}",
    page,
    pageSize,
    extraQuery: { raw: "true" },
  });

  const rows = (domainRows ?? []).map(toRow);

  return (
    <PageShell
      title="${title}"
      count={total}
      toolbarConfig={config.toolbar}
      toolbarActions={config.actions}
      chipConfig={config.chips}
      enableAdvancedFilters={true}
      showSaveViewButton={false}
      showToolbarContainer={false}
    >
      <ResourceTableClient
        config={config.viewConfig}
        initialRows={rows}
        initialTotal={total}
        page={page}
        pageSize={pageSize}
      />
    </PageShell>
  );
}`;
}

// Generate config content (simplified version)
function generateConfigContent(config) {
  const { resource, title, fields } = config;
  
  return `// Auto-generated configuration for ${title}
import { BaseViewConfig } from "@/components/forms/resource-view/types";
import { ToolbarConfig } from "@/components/forms/shell/types";
import { ActionConfig } from "@/components/forms/shell/types";

export const ${resource}ViewConfig: BaseViewConfig<any> = {
  resourceKeyForDelete: "${resource}",
  formsRouteSegment: "${resource}",
  idField: "id",
  toolbar: { left: [], right: [] },
  quickFilters: [],
  features: {
    rowSelection: true,
    pagination: true,
    sorting: true,
    filtering: true,
    inlineEditing: false,
  },
  buildColumns: () => [
    ${fields.map(field => `{
      id: "${field.key}",
      accessorKey: "${field.key}",
      header: "${field.label}",
      cell: ({ row }) => row.getValue("${field.key}"),
      enableSorting: true,
      enableHiding: true,
      enableResizing: true,
      size: 150,
    }`).join(',\n    ')}
  ],
};

export const ${resource}Toolbar: ToolbarConfig = {
  left: [
    {
      id: "new",
      label: "New ${title}",
      icon: "Plus",
      variant: "default",
      href: "/forms/${resource}/new",
      requiredAny: ["resource:${resource}:create"],
    },
    {
      id: "delete",
      label: "Delete",
      icon: "Trash2",
      variant: "destructive",
      action: "deleteSelected",
      enableWhen: "anySelected",
      requiredAny: ["resource:${resource}:delete"],
    },
  ],
  right: [],
};

export const ${resource}Actions: ActionConfig = {
  deleteSelected: {
    method: "DELETE",
    endpoint: "/api/${resource}/bulk-delete",
  },
  exportCsv: {
    method: "GET",
    endpoint: "/api/${resource}/export",
    target: "_blank",
  },
};

export const ${resource}Chips = [
  ${fields.filter(f => f.filterable !== false).map(field => `{
    id: "${field.key}",
    label: "${field.label}",
    type: "${field.type}",
  }`).join(',\n  ')}
];

export const title = "${title}";

export const config = {
  title,
  viewConfig: ${resource}ViewConfig,
  toolbar: ${resource}Toolbar,
  chips: ${resource}Chips,
  actions: ${resource}Actions,
};`;
}

// Run the generator
generateResourcePage();
