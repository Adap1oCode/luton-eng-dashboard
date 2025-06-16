// File: /src/app/(main)/dashboard/requisitions/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useDataTable } from '@/components/data-table/hooks/use-data-table'
import { supabase } from '@/lib/supabase'

import TileRow from '@/components/widgets/tile-row'
import ChartMonthly from '@/components/widgets/chart-monthly'
import ChartByStatus from '@/components/widgets/chart-by-status'
import ChartByCreator from '@/components/widgets/chart-by-creator'
import ChartByProject from '@/components/widgets/chart-by-project'
import RequisitionTable from './_components/requisition-table'
import { columns } from './_components/columns'

export default function RequisitionsPage() {
  const [requisitions, setRequisitions] = useState<any[]>([])
  const table = useDataTable({ data: requisitions, columns })

  useEffect(() => {
    supabase
      .from('requisitions')
      .select('*')
      .then(({ data }) => setRequisitions(data || []))
  }, [])

  return (
    <div className="@container/main flex flex-col gap-6 p-6">
      <TileRow data={requisitions} />
      <ChartMonthly data={requisitions} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartByStatus data={requisitions} />
        <ChartByCreator data={requisitions} />
        <ChartByProject data={requisitions} className="md:col-span-2" />
      </div>
      <RequisitionTable table={table} columns={columns} />
    </div>
  )
}
