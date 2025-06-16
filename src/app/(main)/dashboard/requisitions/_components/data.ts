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

export async function getRequisitions(range: string): Promise<Requisition[]> {
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

export async function getRequisitionMetrics(range: string): Promise<any> {
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
      summary: [],
      trends: [],
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

  const summaryRaw = await getRequisitionSummary()

  return {
    summary: [
      { key: 'totalAllTime', title: 'Total Requisitions', value: summaryRaw.total ?? 0, subtitle: 'All Time' },
      { key: 'issued', title: 'Issued', value: summaryRaw.issued ?? 0, subtitle: 'Current' },
      { key: 'inProgress', title: 'In Progress', value: summaryRaw.inProgress ?? 0, subtitle: 'Current' },
      { key: 'completed', title: 'Completed', value: summaryRaw.completed ?? 0, subtitle: 'Current' },
      { key: 'cancelled', title: 'Cancelled', value: summaryRaw.cancelled ?? 0, subtitle: 'Current' },
      { key: 'late', title: 'Late', value: summaryRaw.late ?? 0, subtitle: 'Current' },
    ],
    trends: [
      { key: 'totalReqs', title: 'Total Reqs', ...metric(current.length, previous.length) },
      { key: 'closedReqs', title: 'Closed - Pick Complete', ...metric(
        current.filter(r => r.status === 'Closed - Pick Complete').length,
        previous.filter(r => r.status === 'Closed - Pick Complete').length
      )},
      { key: 'missingOrderDate', title: 'Missing Order Date', ...metric(
        current.filter(r => !r.order_date).length,
        previous.filter(r => !r.order_date).length
      )},
      { key: 'missingDueDate', title: 'Missing Due Date', ...metric(
        current.filter(r => !r.due_date).length,
        previous.filter(r => !r.due_date).length
      )},
    ]
  }
}

export async function getRequisitionSummary(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('requisitions')
    .select('status, order_date, due_date')

  if (error || !data) return {}

  const matchStatus = (status: string, match: string[]) =>
    match.some(keyword => status.toLowerCase().includes(keyword))

  const total = data.length
  const issued = data.filter(r => matchStatus(r.status ?? '', ['issued'])).length
  const inProgress = data.filter(r => matchStatus(r.status ?? '', ['in progress'])).length
  const completed = data.filter(r => matchStatus(r.status ?? '', ['closed - pick complete'])).length
  const cancelled = data.filter(r => matchStatus(r.status ?? '', ['cancel'])).length
  const late = data.filter(r =>
    r.order_date && r.due_date && new Date(r.due_date) < new Date(r.order_date)
  ).length

  return {
    total,
    issued,
    inProgress,
    completed,
    cancelled,
    late,
  }
}