// src/app/(main)/dashboard/requisitions/_components/data.ts

import { supabase } from '@/lib/supabase'

export type Requisition = {
  requisition_order_number: string
  order_date: string | null
  due_date: string | null
  status: string
  warehouse: string | null
  created_by: string | null
  project_number: string | null
  customer_name: string | null
}

export async function getRequisitions(range: '3m' | '6m' | '12m'): Promise<Requisition[]> {
  const months = parseInt(range.replace('m', ''))
  const fromDate = new Date()
  fromDate.setMonth(fromDate.getMonth() - months)

  const { data, error } = await supabase
    .from('requisitions')
    .select('requisition_order_number, order_date, due_date, status, warehouse, created_by, project_number')
    .gte('order_date', fromDate.toISOString())

  if (error || !data) return []

  return data.map((r) => ({
    requisition_order_number: r.requisition_order_number ?? '',
    order_date: r.order_date ?? '',
    due_date: r.due_date ?? '',
    status: r.status ?? '',
    warehouse: r.warehouse ?? '',
    created_by: r.created_by ?? '',
    project_number: r.project_number ?? '',
    customer_name: 'N/A',
  }))
}

export async function getRequisitionMetrics(range: '3m' | '6m' | '12m') {
  const now = new Date()
  const rangeMonths = parseInt(range.replace('m', ''))

  const startOfCurrent = new Date(now)
  startOfCurrent.setMonth(now.getMonth() - rangeMonths)

  const startOfPrevious = new Date(startOfCurrent)
  startOfPrevious.setMonth(startOfCurrent.getMonth() - rangeMonths)

  const { data, error } = await supabase
    .from('requisitions')
    .select('order_date, due_date, status')
    .gte('order_date', startOfPrevious.toISOString())

  if (error || !data) {
    return {
      totalReqs: { value: 0, trend: '0%', direction: 'up', subtitle: 'No data available' },
      closedReqs: { value: 0, trend: '0%', direction: 'up', subtitle: 'No data available' },
      missingOrderDate: { value: 0, trend: '0%', direction: 'up', subtitle: 'No data available' },
      missingDueDate: { value: 0, trend: '0%', direction: 'up', subtitle: 'No data available' },
    }
  }

  const current = data.filter(r => r.order_date && new Date(r.order_date) >= startOfCurrent)
  const previous = data.filter(r => r.order_date && new Date(r.order_date) < startOfCurrent)

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
    totalReqs: metric(current.length, previous.length),
    closedReqs: metric(
      current.filter(r => r.status === 'Closed - Pick Complete').length,
      previous.filter(r => r.status === 'Closed - Pick Complete').length
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
