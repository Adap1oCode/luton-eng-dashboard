import { supabase } from '@/lib/supabase'

export type PurchaseOrder = {
  po_number: string
  order_date: string | null
  due_date: string | null
  status: string
  warehouse: string | null
  vendor_name: string | null
  grand_total: string | null
}

export async function getPurchaseOrders(range: string): Promise<PurchaseOrder[]> {
  const months = parseInt(range.replace('m', ''))
  const fromDate = new Date()
  fromDate.setMonth(fromDate.getMonth() - months)

  const { data, error } = await supabase
    .from('purchaseorders')
    .select('po_number, order_date, due_date, status, warehouse, vendor_name, grand_total')
 //   .gte('order_date', fromDate.toISOString()) //

  if (error || !data) return []

  return data.map((row) => ({
    po_number: row.po_number ?? '',
    order_date: row.order_date ?? '',
    due_date: row.due_date ?? '',
    status: row.status ?? '',
    warehouse: row.warehouse ?? '',
    vendor_name: row.vendor_name ?? '',
    grand_total: row.grand_total ?? '',
  }))
}

export async function getPurchaseOrderMetrics(range: string) {
  const now = new Date()
  const months = parseInt(range.replace('m', ''))

  const startOfCurrent = new Date(now)
  startOfCurrent.setMonth(now.getMonth() - months)

  const startOfPrevious = new Date(startOfCurrent)
  startOfPrevious.setMonth(startOfCurrent.getMonth() - months)

  const { data, error } = await supabase
    .from('purchaseorders')
    .select('order_date, due_date, status')
    .gte('order_date', startOfPrevious.toISOString())

  if (error || !data) {
    console.warn('Error fetching metrics:', error)
    return {
      totalPOs: { value: 0, trend: '0%', direction: 'up', subtitle: 'No data available' },
      closedPOs: { value: 0, trend: '0%', direction: 'up', subtitle: 'No data available' },
      missingOrderDate: { value: 0, trend: '0%', direction: 'up', subtitle: 'No data available' },
      missingDueDate: { value: 0, trend: '0%', direction: 'up', subtitle: 'No data available' },
    }
  }

  const current = data.filter(r => r.order_date && new Date(r.order_date) >= startOfCurrent)
  const previous = data.filter(r => r.order_date && new Date(r.order_date) < startOfCurrent)

  console.log('Total rows in current window:', current.length)
  console.log('Statuses:', [...new Set(current.map(r => r.status))])

  const metric = (curr: number, prev: number) => {
    const trend = prev === 0 ? 100 : ((curr - prev) / prev) * 100
    return {
      value: curr,
      trend: `${trend.toFixed(1)}%`,
      direction: trend >= 0 ? 'up' : 'down',
      subtitle: `${Math.abs(trend).toFixed(1)}% ${trend >= 0 ? 'increase' : 'decrease'} from prior period`,
    }
  }

  return {
    totalPOs: metric(current.length, previous.length),
    closedPOs: metric(
      current.filter(r =>
        r.status?.toLowerCase() === 'closed - po received complete'
      ).length,
      previous.filter(r =>
        r.status?.toLowerCase() === 'closed - po received complete'
      ).length
    ),
    missingOrderDate: metric(
      current.filter(r => !r.order_date).length,
      previous.filter(r => !r.order_date).length
    ),
    missingDueDate: metric(
      current.filter(r => !r.due_date).length,
      previous.filter(r => !r.due_date).length
    ),
  }
}
