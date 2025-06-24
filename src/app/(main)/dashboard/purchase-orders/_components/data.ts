import { supabase } from '@/lib/supabase'

export type PurchaseOrder = {
  [key: string]: any
  po_number: string
  order_date: string | null
  due_date: string | null
  status: string
  warehouse: string | null
  created_by: string | null
  project_number: string | null
  supplier: string | null
  po_type: string | null
}

export async function getPurchaseOrders(
  _range: string, // retained for signature consistency
  _from?: string,
  _to?: string
): Promise<PurchaseOrder[]> {
  const { data, error } = await supabase
    .from('purchaseorders')
    .select('*')

  if (error || !data) return []

  return data.map((po) => ({
    ...po,
    po_number: po.po_number ?? '',
    order_date: po.order_date ?? '',
    due_date: po.due_date ?? '',
    status: po.status ?? '',
    warehouse: po.warehouse ?? '',
    created_by: po.created_by ?? '',
    project_number: po.project_number ?? '',
    supplier: po.supplier ?? 'N/A',
    po_type: po.po_type ?? 'N/A',
  }))
}
