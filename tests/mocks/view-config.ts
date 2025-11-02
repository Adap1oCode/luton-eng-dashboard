// Mock view configuration for testing
export const mockViewConfig = {
  key: 'test-resource',
  title: 'Test Resource',
  columns: [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      type: 'number',
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      filterable: true,
      type: 'text',
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      filterable: true,
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
    {
      key: 'created_at',
      label: 'Created At',
      sortable: true,
      type: 'date',
    },
  ],
  filters: [
    {
      key: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { value: 'all', label: 'All' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
    {
      key: 'search',
      type: 'text',
      label: 'Search',
      placeholder: 'Search by name...',
    },
  ],
  actions: [
    {
      key: 'create',
      type: 'button',
      label: 'Create New',
      style: 'primary',
      permission: 'test-resource:create',
    },
    {
      key: 'export',
      type: 'button',
      label: 'Export',
      style: 'secondary',
      permission: 'test-resource:export',
    },
  ],
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [10, 25, 50, 100],
  },
  permissions: {
    create: ['test-resource:create'],
    read: ['test-resource:read'],
    update: ['test-resource:update'],
    delete: ['test-resource:delete'],
    export: ['test-resource:export'],
  },
};

export const mockFormConfig = {
  key: 'test-form',
  title: 'Test Form',
  fields: [
    {
      key: 'name',
      type: 'text',
      label: 'Name',
      required: true,
      validation: {
        minLength: 3,
        maxLength: 255,
      },
    },
    {
      key: 'email',
      type: 'email',
      label: 'Email',
      required: true,
      validation: {
        pattern: '^[^@]+@[^@]+\\.[^@]+$',
      },
    },
    {
      key: 'status',
      type: 'select',
      label: 'Status',
      required: true,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ],
  sections: [
    {
      key: 'basic-info',
      title: 'Basic Information',
      fields: ['name', 'email'],
    },
    {
      key: 'details',
      title: 'Additional Details',
      fields: ['status'],
    },
  ],
  validation: {
    rules: [
      {
        field: 'name',
        type: 'required',
        message: 'Name is required',
      },
      {
        field: 'email',
        type: 'required',
        message: 'Email is required',
      },
      {
        field: 'email',
        type: 'pattern',
        value: '^[^@]+@[^@]+\\.[^@]+$',
        message: 'Please enter a valid email address',
      },
    ],
  },
  actions: [
    {
      key: 'save',
      type: 'submit',
      label: 'Save',
      style: 'primary',
      permission: 'test-form:create',
    },
    {
      key: 'cancel',
      type: 'cancel',
      label: 'Cancel',
      style: 'secondary',
    },
  ],
  permissions: {
    create: ['test-form:create'],
    read: ['test-form:read'],
    update: ['test-form:update'],
    delete: ['test-form:delete'],
  },
};

export const mockData = {
  rows: [
    {
      id: 1,
      name: 'Test Item 1',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Test Item 2',
      status: 'inactive',
      created_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 3,
      name: 'Test Item 3',
      status: 'active',
      created_at: '2024-01-03T00:00:00Z',
    },
  ],
  total: 3,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};

export const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  permissions: [
    'test-resource:read',
    'test-resource:create',
    'test-resource:update',
    'test-form:read',
    'test-form:create',
  ],
};

export const mockApiResponse = {
  success: true,
  data: mockData,
  message: 'Data fetched successfully',
};

export const mockErrorResponse = {
  success: false,
  error: 'Network error',
  message: 'Failed to fetch data',
};
