// src/app/(main)/dashboard/forms/audit/config.ts

export type FieldConfig = {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'textarea'
  required: boolean
  options?: string[]
  helperText?: string
  colSpan?: number
  defaultValue?: string | number | string[] | Date
}

export const tableName = "audit";
// New: title & description live in config
export const formTitle = "Fortnightly Audit Submission";
export const formDescription = "Fill in the audit details and submit to Supabase.";

// New: define exactly which columns to show in the table, and in what order
export const auditTableColumns: { 
  name: keyof typeof auditFormConfig[number] | string; 
  label: string; 
}[] = [
  { name: "id",               label: "ID" },
  { name: "submission_date",  label: "Date" },
  { name: "submitted_by",     label: "Submitted By" },
  { name: "auditor",          label: "Auditor" },
  // …add more fields here as needed…
];

export const auditFormConfig: FieldConfig[] = [
  {
    name: 'submitted_by',
    label: 'Submitted By',
    type: 'select',
    required: true,
    options: ['Abdul Salam'],
    helperText: 'Who is submitting this form?',
    colSpan: 1,
  },
  {
    name: 'auditor',
    label: 'Auditor',
    type: 'select',
    required: true,
    options: ['Evans', 'Eric', 'Asif', 'Rahim'],
    helperText: 'Person performing the audit.',
    colSpan: 1,
  },
  {
    name: 'store_officer',
    label: 'Store Officer',
    type: 'select',
    required: true,
    options: ['Elsie', 'Munir', 'Rashid', 'Ali', 'Sana', 'Tariq', 'Zubair'],
    helperText: 'Officer responsible for the location.',
    colSpan: 1,
  },
  {
    name: 'audit_window',
    label: 'Audit Window',
    type: 'date',
    required: true,
    helperText: 'Date the audit was conducted.',
    colSpan: 1,
  },
  {
    name: 'warehouse',
    label: 'Warehouse',
    type: 'select',
    required: true,
    options: ['BP - WH 1', 'AMC - WH 2', 'AM - WH 3', 'RTZ - WH 4'],
    helperText: 'Select the warehouse audited.',
    colSpan: 2,
  },
  {
    name: 'zone',
    label: 'Zone',
    type: 'multiselect',
    required: true,
    options: ['A', 'B', 'C', 'D', 'E', 'F', 'QUAR', 'OBS'],
    helperText: 'Tick all applicable zones.',
    colSpan: 2,
  },
  {
    name: 'location',
    label: 'Location',
    type: 'text',
    required: true,
    helperText: 'Specific location or area audited.',
    colSpan: 2,
  },
  {
    name: 'total_items',
    label: 'Total Items in IMS to be Audited',
    type: 'number',
    required: true,
    helperText: 'Expected total based on IMS.',
    colSpan: 1,
  },
  {
    name: 'actual_items',
    label: 'Actual Items Audited',
    type: 'number',
    required: true,
    helperText: 'Number of items physically checked.',
    colSpan: 1,
  },
  {
    name: 'incorrect_qty_ims',
    label: 'Incorrect Quantity – IMS',
    type: 'number',
    required: true,
    helperText: 'Mismatched IMS quantity.',
    colSpan: 1,
  },
  {
    name: 'incorrect_qty_tc',
    label: 'Incorrect Quantity – TallyCard',
    type: 'number',
    required: true,
    helperText: 'Discrepancies in TallyCard count.',
    colSpan: 1,
  },
  {
    name: 'items_not_in_location',
    label: 'Items not in location',
    type: 'number',
    required: true,
    helperText: 'Items missing from expected location.',
    colSpan: 1,
  },
  {
    name: 'extra_items_in_location',
    label: 'Extra Items in Location',
    type: 'number',
    required: true,
    helperText: 'Items found that were not expected.',
    colSpan: 1,
  },
  {
    name: 'incorrect_uom',
    label: 'Incorrect UoM',
    type: 'number',
    required: true,
    helperText: 'Incorrect unit of measure recorded.',
    colSpan: 1,
  },
  {
    name: 'items_damaged',
    label: 'Items – Damaged',
    type: 'number',
    required: true,
    helperText: 'Items physically damaged.',
    colSpan: 1,
  },
  {
    name: 'items_quarantined',
    label: 'Items – Quarantined',
    type: 'number',
    required: true,
    helperText: 'Items moved to quarantine.',
    colSpan: 1,
  },
  {
    name: 'primary_rc',
    label: 'Primary Root Cause',
    type: 'select',
    required: false,
    options: ['Human Error', 'System Error', 'Other'],
    helperText: 'Select a primary reason if applicable.',
    colSpan: 1,
  },
  {
    name: 'secondary_rc',
    label: 'Secondary Root Cause',
    type: 'multiselect',
    required: false,
    options: ['Human Error', 'System Error', 'Other'],
    helperText: 'Any additional contributing factors.',
    colSpan: 1,
  },
  {
    name: 'comment',
    label: 'Comments',
    type: 'textarea',
    required: false,
    helperText: 'Add any other relevant context.',
    colSpan: 2,
  },
];
