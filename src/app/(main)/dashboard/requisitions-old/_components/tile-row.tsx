'use client'

import { useEffect, useState } from 'react'
import { TileCard } from './tile-card'
import { fetchRequisitionMetrics } from '../_utils/fetch-requisition-metrics'

export default function TileRow() {
    const [metrics, setMetrics] = useState({
    totalReqs: 0,
    closedReqs: 0,
    missingOrderDate: 0,
    missingDueDate: 0,
  })

  useEffect(() => {
    fetchRequisitionMetrics().then(data => {
      console.log('Fetched metrics:', data)
      setMetrics(data)
    })
  }, [])

  return (
    <div className="@container/main grid grid-cols-1 gap-4 @md/main:grid-cols-2 @5xl/main:grid-cols-4">
      <TileCard
        title="Total Reqs"
        value={metrics.totalReqs.toString()}
        subtitle="Up this quarter"
        trend="+8.2%"
        trendDirection="up"
      />
      <TileCard
        title="Closed - Pick Complete"
        value={metrics.closedReqs.toString()}
        subtitle="Slight dip from Q1"
        trend="-1.3%"
        trendDirection="down"
      />
      <TileCard
        title="Missing Order Date"
        value={metrics.missingOrderDate.toString()}
        subtitle="Should be reviewed"
        trend="+3.4%"
        trendDirection="up"
      />
      <TileCard
        title="Missing Due Date"
        value={metrics.missingDueDate.toString()}
        subtitle="Needs clean up"
        trend="+2.6%"
        trendDirection="up"
      />
    </div>
  )
}
