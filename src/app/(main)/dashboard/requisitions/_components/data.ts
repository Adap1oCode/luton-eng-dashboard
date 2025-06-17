import { supabase } from '@/lib/supabase'

export type Requisition = {
  [key: string]: any
  requisition_order_number: string
  order_date: string | null
  due_date: string | null
  status: string
  warehouse: string | null
  created_by: string | null
  project_number: string | null
  customer_name: string | null
}

export async function getRequisitions(
  _range: string,
  _from?: string,
  _to?: string
): Promise<Requisition[]> {
  const { data, error } = await supabase
    .from('requisitions')
    .select('*') // ✅ Pull everything, no filters

  if (error || !data) return []

  return data.map((r) => ({
    ...r,
    requisition_order_number: r.requisition_order_number ?? '',
    order_date: r.order_date ?? '',
    due_date: r.due_date ?? '',
    status: r.status ?? '',
    warehouse: r.warehouse ?? '',
    created_by: r.created_by ?? '',
    project_number: r.project_number ?? '',
    customer_name: r.customer_name ?? 'N/A',
  }))
}
