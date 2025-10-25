import { BaseViewConfig } from '@/components/data-table/view-defaults'
import { ToolbarConfig, ActionConfig } from '@/components/forms/shell/toolbar/types'

// Types for the generator
export interface ResourcePageConfig {
  // Required: The resource to use
  resource: string
  // Required: The title for the page
  title: string
  // Required: The fields to display
  fields: ResourceField[]
  // Optional: Custom toolbar configuration
  toolbar?: Partial<ToolbarConfig>
  // Optional: Custom actions
  actions?: Partial<ActionConfig>
  // Optional: Custom features
  features?: {
    rowSelection?: boolean
    pagination?: boolean
    sorting?: boolean
    filtering?: boolean
    inlineEditing?: boolean
  }
  // Optional: Custom column configurations
  columnConfig?: {
    resizable?: boolean
    reorderable?: boolean
    hideable?: boolean
  }
}

export interface ResourceField {
  // Required: The field key from the resource
  key: string
  // Required: Display label
  label: string
  // Optional: Field type for rendering
  type?: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'status'
  // Optional: Column width
  width?: number
  // Optional: Whether field is sortable
  sortable?: boolean
  // Optional: Whether field is filterable
  filterable?: boolean
  // Optional: Whether field is editable
  editable?: boolean
  // Optional: Custom render function
  render?: (value: any, row: any) => React.ReactNode
  // Optional: Select options for select fields
  options?: Array<{ value: string; label: string }>
}

// Generate a complete resource page configuration
export function generateResourcePage(config: ResourcePageConfig) {
  const {
    resource,
    title,
    fields,
    toolbar = {},
    actions = {},
    features = {},
    columnConfig = {}
  } = config

  // Generate view configuration
  const viewConfig: BaseViewConfig<any> = {
    resourceKeyForDelete: resource,
    formsRouteSegment: resource.replace(/_/g, '-'), // Convert snake_case to kebab-case
    idField: 'id',
    toolbar: { left: [], right: [] },
    quickFilters: [],
    features: {
      rowSelection: features.rowSelection ?? true,
      pagination: features.pagination ?? true,
      sortable: features.sorting ?? true,
    },
    buildColumns: () => generateColumns(fields, columnConfig),
  }

  // Generate toolbar configuration
  const toolbarConfig: ToolbarConfig = {
    left: [
      {
        id: 'new',
        label: `New ${title}`,
        icon: 'Plus',
        variant: 'default',
        href: `/forms/${resource.replace(/_/g, '-')}/new`,
        requiredAny: [`resource:${resource}:create`],
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: 'Trash2',
        variant: 'destructive',
        action: 'deleteSelected',
        enableWhen: 'anySelected',
        requiredAny: [`resource:${resource}:delete`],
      },
      ...(toolbar.left || [])
    ],
    right: toolbar.right || [],
  }

  // Generate actions configuration
  const actionsConfig: ActionConfig = {
    deleteSelected: {
      method: 'DELETE',
      endpoint: `/api/${resource}/bulk-delete`,
    },
    exportCsv: {
      method: 'GET',
      endpoint: `/api/${resource}/export`,
      target: '_blank',
    },
    ...actions,
  }

  // Generate chips configuration (for filters)
  const chipsConfig = generateChipsConfig(fields)

  return {
    title,
    viewConfig,
    toolbarConfig,
    actionsConfig,
    chipsConfig,
    // Export for easy use in page.tsx
    config: {
      title,
      viewConfig,
      toolbar: toolbarConfig,
      chips: chipsConfig,
      actions: actionsConfig,
    }
  }
}

// Generate columns from field configuration
function generateColumns(fields: ResourceField[], columnConfig: any) {
  return fields.map(field => ({
    id: field.key,
    accessorKey: field.key,
    header: field.label,
    cell: ({ row }: any) => {
      const value = row.getValue(field.key)
      
      if (field.render) {
        return field.render(value, row.original)
      }
      
      // Default rendering based on type
      switch (field.type) {
        case 'date':
          return new Date(value).toLocaleDateString()
        case 'boolean':
          return value ? 'Yes' : 'No'
        case 'status':
          return `{value}`
        case 'select':
          const option = field.options?.find(opt => opt.value === value)
          return option?.label || value
        default:
          return value
      }
    },
    enableSorting: field.sortable ?? true,
    enableHiding: columnConfig.hideable ?? true,
    enableResizing: columnConfig.resizable ?? true,
    size: field.width || 150,
  }))
}

// Generate chips configuration for filters
function generateChipsConfig(fields: ResourceField[]) {
  const filterableFields = fields.filter(field => field.filterable !== false)
  
  return filterableFields.map(field => ({
    id: field.key,
    label: field.label,
    type: field.type || 'text',
    options: field.options,
  }))
}

// Generate the complete page.tsx content
export function generatePageContent(config: ResourcePageConfig) {
  const { resource, title, fields } = config
  const generated = generateResourcePage(config)
  
  return `// Auto-generated page for ${title}
import type { Metadata } from "next";
import PageShell from "@/components/forms/shell/page-shell";
import { fetchResourcePage } from "@/lib/data/resource-fetch";
import { resolveSearchParams, parsePagination, type SPRecord } from "@/lib/next/search-params";
import ResourceTableClient from "@/components/forms/resource-view/resource-table-client";

// Generated configuration
import { config } from "./${resource.replace(/_/g, '-')}.config";

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

// Generate the config file content
export function generateConfigContent(config: ResourcePageConfig) {
  const generated = generateResourcePage(config)
  
  return `// Auto-generated configuration for ${config.title}
import { ${Object.keys(generated).join(', ')} } from './${config.resource.replace(/_/g, '-')}.generated';

export const ${config.resource.replace(/_/g, '_')}ViewConfig = ${JSON.stringify(generated.viewConfig, null, 2)};

export const ${config.resource.replace(/_/g, '_')}Toolbar = ${JSON.stringify(generated.toolbarConfig, null, 2)};

export const ${config.resource.replace(/_/g, '_')}Actions = ${JSON.stringify(generated.actionsConfig, null, 2)};

export const ${config.resource.replace(/_/g, '_')}Chips = ${JSON.stringify(generated.chipsConfig, null, 2)};

export const title = "${config.title}";

export const config = {
  title,
  viewConfig: ${config.resource.replace(/_/g, '_')}ViewConfig,
  toolbar: ${config.resource.replace(/_/g, '_')}Toolbar,
  chips: ${config.resource.replace(/_/g, '_')}Chips,
  actions: ${config.resource.replace(/_/g, '_')}Actions,
};`;
}
