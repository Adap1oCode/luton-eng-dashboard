import { supabase } from '@/lib/supabase'

export async function fetchRequisitionMetrics() {
  try {
    const metrics = {
      totalReqs: 0,
      closedReqs: 0,
      missingOrderDate: 0,
      missingDueDate: 0,
    }

    const [totalRes, closedRes, missingOrderRes, missingDueRes] = await Promise.all([
      supabase.from('requisitions').select('*', { count: 'exact', head: true }),
      supabase.from('requisitions').select('*', { count: 'exact', head: true }).eq('status', 'Closed - Pick Complete'),
      supabase.from('requisitions').select('*', { count: 'exact', head: true }).is('order_date', null),
      supabase.from('requisitions').select('*', { count: 'exact', head: true }).is('due_date', null),
    ])

    if (totalRes.error) console.error('❌ totalReqs error:', totalRes.error.message)
    if (closedRes.error) console.error('❌ closedReqs error:', closedRes.error.message)
    if (missingOrderRes.error) console.error('❌ missingOrderDate error:', missingOrderRes.error.message)
    if (missingDueRes.error) console.error('❌ missingDueDate error:', missingDueRes.error.message)

    metrics.totalReqs = totalRes.count || 0
    metrics.closedReqs = closedRes.count || 0
    metrics.missingOrderDate = missingOrderRes.count || 0
    metrics.missingDueDate = missingDueRes.count || 0

    console.log('✅ Final metrics:', metrics) // 👈 You can now see this in the browser console (devtools)

    return metrics
  } catch (error) {
    console.error('❌ Unexpected fetch error:', error)
    return {
      totalReqs: 0,
      closedReqs: 0,
      missingOrderDate: 0,
      missingDueDate: 0,
    }
  }
}
