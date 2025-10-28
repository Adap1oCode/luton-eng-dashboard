// -----------------------------------------------------------------------------
// FILE: src/app/(main)/tools/screen-generator/page.tsx
// TYPE: Client Page (dev tool)
// PURPOSE: Comprehensive UI to configure ALL generator parameters (user + auto-generated)
// -----------------------------------------------------------------------------

"use client";

import { useEffect, useMemo, useState } from "react";

function kebabCase(input: string) {
  return String(input)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\\s]+/g, "-")
    .toLowerCase();
}

function titleCase(input: string) {
  return String(input)
    .replace(/[-_]/g, " ")
    .replace(/\\s+/g, " ")
    .trim()
    .replace(/\\b\\w/g, (m) => m.toUpperCase());
}

function pascalCase(input: string) {
  return String(input)
    .replace(/[-_\\s]+/g, " ")
    .trim()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

// Types for our comprehensive configuration
interface GeneratorConfig {
  // Core Identity (User Input)
  resourceKey: string;
  screenName: string;
  routeSegment: string;
  
  // Auto-Generated Identity
  apiEndpoint: string;
  resourceTitle: string;
  permissionPrefix: string;
  componentName: string;
  
  // Column Configuration (User Input)
  displayColumns: string[];
  columnOrder: string[];
  columnHeaders: Record<string, string>;
  columnWidths: Record<string, number>;
  hyperlinkColumn: string;
  readonlyColumns: string[];
  inlineEditColumns: string[];
  
  // Quick Filters (User Input)
  quickFilterType: "none" | "status" | "custom";
  statusFilterOptions: Array<{ value: string; label: string; query: Record<string, any> }>;
  customFilters: Array<{ id: string; label: string; type: string; options?: Array<{ value: string; label: string }> }>;
  
  // Toolbar Configuration (User Input)
  includeNewButton: boolean;
  includeDeleteButton: boolean;
  includeExportButton: boolean;
  customButtons: Array<{ id: string; label: string; variant: string; action?: string }>;
  
  // Table Features (User Input with Defaults)
  rowSelection: boolean;
  pagination: boolean;
  sorting: boolean;
  globalSearch: boolean;
  columnResizing: boolean;
  saveView: boolean;
  
  // Form Configuration (Auto-Generated from Display Columns)
  formFields: string[];
  requiredFields: string[];
  fieldTypes: Record<string, string>;
  fieldLabels: Record<string, string>;
  fieldPlaceholders: Record<string, string>;
  
  // Navigation & Routing (Auto-Generated)
  editRoute: string;
  newRoute: string;
  listRoute: string;
  
  // UI Configuration (Auto-Generated)
  pageTitle: string;
  errorMessages: Record<string, string>;
  loadingMessages: Record<string, string>;
  
  // Security & Permissions (Auto-Generated)
  createPermission: string;
  readPermission: string;
  updatePermission: string;
  deletePermission: string;
  exportPermission: string;
  
  // Performance & Caching (Defaults)
  staleTime: number;
  maxRetries: number;
  retryDelay: number;
  
  // Responsive & Accessibility (Defaults)
  mobileLayout: string;
  keyboardNavigation: boolean;
  screenReaderSupport: boolean;
  
  // Testing & Development (Defaults)
  consoleLogging: boolean;
  errorBoundary: boolean;
  testData: boolean;
}

export default function ScreenGeneratorPage() {
  const [resources, setResources] = useState<string[]>([]);
  const [resourceMetadata, setResourceMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"basic" | "columns" | "filters" | "toolbar" | "features" | "advanced" | "preview">("basic");
  
  // Comprehensive configuration state
  const [config, setConfig] = useState<GeneratorConfig>({
    // Core Identity
    resourceKey: "",
    screenName: "",
    routeSegment: "",
    apiEndpoint: "",
    resourceTitle: "",
    permissionPrefix: "",
    componentName: "",
    
    // Column Configuration
    displayColumns: [],
    columnOrder: [],
    columnHeaders: {},
    columnWidths: {},
    hyperlinkColumn: "",
    readonlyColumns: [],
    inlineEditColumns: [],
    
    // Quick Filters
    quickFilterType: "none",
    statusFilterOptions: [],
    customFilters: [],
    
    // Toolbar Configuration
    includeNewButton: true,
    includeDeleteButton: true,
    includeExportButton: true,
    customButtons: [],
    
    // Table Features
    rowSelection: true,
    pagination: true,
    sorting: true,
    globalSearch: true,
    columnResizing: true,
    saveView: true,
    
    // Form Configuration
    formFields: [],
    requiredFields: [],
    fieldTypes: {},
    fieldLabels: {},
    fieldPlaceholders: {},
    
    // Navigation & Routing
    editRoute: "",
    newRoute: "",
    listRoute: "",
    
    // UI Configuration
    pageTitle: "",
    errorMessages: {},
    loadingMessages: {},
    
    // Security & Permissions
    createPermission: "",
    readPermission: "",
    updatePermission: "",
    deletePermission: "",
    exportPermission: "",
    
    // Performance & Caching
    staleTime: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    
    // Responsive & Accessibility
    mobileLayout: "responsive",
    keyboardNavigation: true,
    screenReaderSupport: true,
    
    // Testing & Development
    consoleLogging: true,
    errorBoundary: true,
    testData: false,
  });

  // Load available resources
  useEffect(() => {
    fetch("/api/tools/resources")
      .then((res) => res.json())
      .then((data) => {
        setResources(data.resources || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load resources:", err);
        setLoading(false);
      });
  }, []);

  // Load resource metadata when resource is selected
  useEffect(() => {
    if (config.resourceKey) {
      fetch(`/api/tools/resource/${config.resourceKey}`)
        .then((res) => res.json())
        .then((data) => {
          setResourceMetadata(data);
          
          // Auto-generate derived values
          const kebab = kebabCase(config.resourceKey);
          const title = titleCase(kebab);
          const pascal = pascalCase(kebab);
          
          setConfig(prev => ({
            ...prev,
            routeSegment: kebab,
            screenName: title,
            apiEndpoint: `/api/${config.resourceKey}`,
            resourceTitle: title,
            permissionPrefix: `resource:${config.resourceKey}`,
            componentName: pascal,
            editRoute: `/forms/${kebab}/{id}/edit`,
            newRoute: `/forms/${kebab}/new`,
            listRoute: `/forms/${kebab}`,
            pageTitle: title,
            createPermission: `resource:${config.resourceKey}:create`,
            readPermission: `resource:${config.resourceKey}:read`,
            updatePermission: `resource:${config.resourceKey}:update`,
            deletePermission: `resource:${config.resourceKey}:delete`,
            exportPermission: `resource:${config.resourceKey}:export`,
            
            // Auto-populate columns from schema
            displayColumns: data.fields?.map((f: any) => f.name) || [],
            columnOrder: data.fields?.map((f: any) => f.name) || [],
            columnHeaders: data.fields?.reduce((acc: any, f: any) => {
              acc[f.name] = titleCase(f.name.replace(/_/g, " "));
              return acc;
            }, {}) || {},
            columnWidths: data.fields?.reduce((acc: any, f: any) => {
              acc[f.name] = 160; // Default width
              return acc;
            }, {}) || {},
            formFields: data.fields?.map((f: any) => f.name) || [],
            fieldTypes: data.fields?.reduce((acc: any, f: any) => {
              acc[f.name] = f.type === "number" ? "number" : "text";
              return acc;
            }, {}) || {},
            fieldLabels: data.fields?.reduce((acc: any, f: any) => {
              acc[f.name] = titleCase(f.name.replace(/_/g, " "));
              return acc;
            }, {}) || {},
            fieldPlaceholders: data.fields?.reduce((acc: any, f: any) => {
              acc[f.name] = `Enter ${titleCase(f.name.replace(/_/g, " ")).toLowerCase()}`;
              return acc;
            }, {}) || {},
          }));
        })
        .catch((err) => {
          console.error("Failed to load resource metadata:", err);
        });
    }
  }, [config.resourceKey]);

  const updateConfig = (updates: Partial<GeneratorConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const previewFiles = useMemo(() => {
    if (!config.resourceKey || !config.routeSegment) return [];

    return [
      `src/app/(main)/forms/${config.routeSegment}/page.tsx`,
      `src/app/(main)/forms/${config.routeSegment}/${config.routeSegment}-client.tsx`,
      `src/app/(main)/forms/${config.routeSegment}/${config.routeSegment}-error-boundary.tsx`,
      `src/app/(main)/forms/${config.routeSegment}/constants.ts`,
      `src/app/(main)/forms/${config.routeSegment}/view.config.tsx`,
      `src/app/(main)/forms/${config.routeSegment}/toolbar.config.tsx`,
    ];
  }, [config.resourceKey, config.routeSegment]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Screen Generator</h1>
        <div className="text-center">Loading resources...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Screen Generator</h1>
      <p className="text-gray-600 mb-8">
        Generate new resource screens with comprehensive configuration options.
      </p>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "basic", label: "Basic Info" },
            { id: "columns", label: "Columns" },
            { id: "filters", label: "Filters" },
            { id: "toolbar", label: "Toolbar" },
            { id: "features", label: "Features" },
            { id: "advanced", label: "Advanced" },
            { id: "preview", label: "Preview" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Form */}
        <div className="space-y-6">
          {activeTab === "basic" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Basic Information</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2">Resource *</label>
                <select
                  value={config.resourceKey}
                  onChange={(e) => updateConfig({ resourceKey: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md"
                >
                  <option value="">Select a resource...</option>
                  {resources.map((resource) => (
                    <option key={resource} value={resource}>
                      {resource}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Screen Name *</label>
                <input
                  type="text"
                  value={config.screenName}
                  onChange={(e) => updateConfig({ screenName: e.target.value })}
                  placeholder="e.g., User Management"
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Route Segment *</label>
                <input
                  type="text"
                  value={config.routeSegment}
                  onChange={(e) => updateConfig({ routeSegment: e.target.value })}
                  placeholder="e.g., user-management"
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Auto-Generated Values</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>API Endpoint:</strong> {config.apiEndpoint}</div>
                  <div><strong>Permission Prefix:</strong> {config.permissionPrefix}</div>
                  <div><strong>Component Name:</strong> {config.componentName}</div>
                  <div><strong>Edit Route:</strong> {config.editRoute}</div>
                  <div><strong>New Route:</strong> {config.newRoute}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "columns" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Column Configuration</h2>
              
              {resourceMetadata?.fields && (
                <div>
                  <label className="block text-sm font-medium mb-2">Display Columns</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-md p-3">
                    {resourceMetadata.fields.map((field: any) => (
                      <label key={field.name} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={config.displayColumns.includes(field.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateConfig({
                                displayColumns: [...config.displayColumns, field.name],
                                columnOrder: [...config.columnOrder, field.name]
                              });
                            } else {
                              updateConfig({
                                displayColumns: config.displayColumns.filter(c => c !== field.name),
                                columnOrder: config.columnOrder.filter(c => c !== field.name)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">
                          {field.name} <span className="text-gray-500">({field.type})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Hyperlink Column</label>
                <select
                  value={config.hyperlinkColumn}
                  onChange={(e) => updateConfig({ hyperlinkColumn: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-md"
                >
                  <option value="">No hyperlink</option>
                  {config.displayColumns.map((col) => (
                    <option key={col} value={col}>
                      {config.columnHeaders[col] || col}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Read-only Columns</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                  {config.displayColumns.map((col) => (
                    <label key={col} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={config.readonlyColumns.includes(col)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateConfig({ readonlyColumns: [...config.readonlyColumns, col] });
                          } else {
                            updateConfig({ readonlyColumns: config.readonlyColumns.filter(c => c !== col) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{config.columnHeaders[col] || col}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "filters" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Quick Filters</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2">Filter Type</label>
                <select
                  value={config.quickFilterType}
                  onChange={(e) => updateConfig({ quickFilterType: e.target.value as any })}
                  className="w-full p-3 border border-gray-300 rounded-md"
                >
                  <option value="none">No filters</option>
                  <option value="status">Status filter</option>
                  <option value="custom">Custom filters</option>
                </select>
              </div>

              {config.quickFilterType === "status" && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Status Filter Options</h3>
                  <p className="text-sm text-blue-800">
                    Status filters will be auto-generated based on your data. 
                    Common patterns: Active/Inactive, Published/Draft, etc.
                  </p>
                </div>
              )}

              {config.quickFilterType === "custom" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Custom Filters</label>
                  <div className="space-y-2">
                    <button
                      onClick={() => updateConfig({
                        customFilters: [...config.customFilters, { id: "", label: "", type: "text", options: [] }]
                      })}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                    >
                      Add Filter
                    </button>
                    {config.customFilters.map((filter, index) => (
                      <div key={index} className="flex space-x-2 p-2 border border-gray-300 rounded">
                        <input
                          type="text"
                          placeholder="Filter ID"
                          value={filter.id}
                          onChange={(e) => {
                            const newFilters = [...config.customFilters];
                            newFilters[index].id = e.target.value;
                            updateConfig({ customFilters: newFilters });
                          }}
                          className="flex-1 p-2 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Filter Label"
                          value={filter.label}
                          onChange={(e) => {
                            const newFilters = [...config.customFilters];
                            newFilters[index].label = e.target.value;
                            updateConfig({ customFilters: newFilters });
                          }}
                          className="flex-1 p-2 border border-gray-300 rounded text-sm"
                        />
                        <select
                          value={filter.type}
                          onChange={(e) => {
                            const newFilters = [...config.customFilters];
                            newFilters[index].type = e.target.value;
                            updateConfig({ customFilters: newFilters });
                          }}
                          className="p-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="text">Text</option>
                          <option value="enum">Enum</option>
                          <option value="boolean">Boolean</option>
                          <option value="date">Date</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "toolbar" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Toolbar Configuration</h2>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.includeNewButton}
                    onChange={(e) => updateConfig({ includeNewButton: e.target.checked })}
                    className="rounded"
                  />
                  <span>Include "New" button</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.includeDeleteButton}
                    onChange={(e) => updateConfig({ includeDeleteButton: e.target.checked })}
                    className="rounded"
                  />
                  <span>Include "Delete" button</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.includeExportButton}
                    onChange={(e) => updateConfig({ includeExportButton: e.target.checked })}
                    className="rounded"
                  />
                  <span>Include "Export CSV" button</span>
                </label>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Auto-Generated Permissions</h3>
                <div className="space-y-1 text-sm">
                  <div><strong>Create:</strong> {config.createPermission}</div>
                  <div><strong>Delete:</strong> {config.deletePermission}</div>
                  <div><strong>Export:</strong> {config.exportPermission}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "features" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Table Features</h2>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.rowSelection}
                    onChange={(e) => updateConfig({ rowSelection: e.target.checked })}
                    className="rounded"
                  />
                  <span>Row Selection</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.pagination}
                    onChange={(e) => updateConfig({ pagination: e.target.checked })}
                    className="rounded"
                  />
                  <span>Pagination</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.sorting}
                    onChange={(e) => updateConfig({ sorting: e.target.checked })}
                    className="rounded"
                  />
                  <span>Column Sorting</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.globalSearch}
                    onChange={(e) => updateConfig({ globalSearch: e.target.checked })}
                    className="rounded"
                  />
                  <span>Global Search</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.columnResizing}
                    onChange={(e) => updateConfig({ columnResizing: e.target.checked })}
                    className="rounded"
                  />
                  <span>Column Resizing</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.saveView}
                    onChange={(e) => updateConfig({ saveView: e.target.checked })}
                    className="rounded"
                  />
                  <span>Save View</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === "advanced" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Advanced Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Stale Time (ms)</label>
                  <input
                    type="number"
                    value={config.staleTime}
                    onChange={(e) => updateConfig({ staleTime: parseInt(e.target.value) })}
                    className="w-full p-3 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Max Retries</label>
                  <input
                    type="number"
                    value={config.maxRetries}
                    onChange={(e) => updateConfig({ maxRetries: parseInt(e.target.value) })}
                    className="w-full p-3 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Retry Delay (ms)</label>
                  <input
                    type="number"
                    value={config.retryDelay}
                    onChange={(e) => updateConfig({ retryDelay: parseInt(e.target.value) })}
                    className="w-full p-3 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.consoleLogging}
                      onChange={(e) => updateConfig({ consoleLogging: e.target.checked })}
                      className="rounded"
                    />
                    <span>Console Logging (Development)</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.errorBoundary}
                      onChange={(e) => updateConfig({ errorBoundary: e.target.checked })}
                      className="rounded"
                    />
                    <span>Error Boundary</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.testData}
                      onChange={(e) => updateConfig({ testData: e.target.checked })}
                      className="rounded"
                    />
                    <span>Include Test Data</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "preview" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Configuration Summary</h2>
              
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Basic Info</h3>
                  <div className="space-y-1 text-sm">
                    <div><strong>Resource:</strong> {config.resourceKey}</div>
                    <div><strong>Screen Name:</strong> {config.screenName}</div>
                    <div><strong>Route:</strong> {config.routeSegment}</div>
                    <div><strong>API:</strong> {config.apiEndpoint}</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Columns ({config.displayColumns.length})</h3>
                  <div className="text-sm space-y-1">
                    {config.displayColumns.map((col) => (
                      <div key={col}>
                        {config.columnHeaders[col] || col}
                        {config.hyperlinkColumn === col && " (hyperlink)"}
                        {config.readonlyColumns.includes(col) && " (read-only)"}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Features</h3>
                  <div className="text-sm space-y-1">
                    <div>Quick Filters: {config.quickFilterType}</div>
                    <div>Toolbar: New={config.includeNewButton ? "✓" : "✗"} Delete={config.includeDeleteButton ? "✓" : "✗"} Export={config.includeExportButton ? "✓" : "✗"}</div>
                    <div>Table: Selection={config.rowSelection ? "✓" : "✗"} Pagination={config.pagination ? "✓" : "✗"} Sorting={config.sorting ? "✓" : "✗"}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Preview</h2>
          
          {previewFiles.length > 0 ? (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-3">Files to be generated:</h3>
              <ul className="space-y-1 text-sm">
                {previewFiles.map((file, index) => (
                  <li key={index} className="text-gray-700 font-mono">
                    {file}
                  </li>
                ))}
              </ul>
              
              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This is a dry-run preview. No files will be created yet.
                </p>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => {
                    // TODO: Implement actual file generation
                    alert("File generation not implemented yet. This is just a preview.");
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Generate Screen
                </button>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              Select a resource to see preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}