// File: /src/app/(main)/dashboard/requisitions/_components/requisition-table.tsx

'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

import { DataTable } from './data-table'
import { type ColumnDef } from '@tanstack/react-table'

interface RequisitionTableProps<TData, TValue> {
  data: TData[]
  columns: ColumnDef<TData, TValue>[]
}

export default function RequisitionTable<TData, TValue>({
  data,
  columns,
}: RequisitionTableProps<TData, TValue>) {
  return (
    <Tabs defaultValue="outline" className="@container/card">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Requisitions</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Powered by Supabase
          </CardDescription>
          <TabsList className="mt-4">
            <TabsTrigger value="outline">Outline</TabsTrigger>
            <TabsTrigger value="past">Past Performance</TabsTrigger>
            <TabsTrigger value="team">Key Personnel</TabsTrigger>
          </TabsList>
        </CardHeader>

        <TabsContent value="outline">
          <CardContent>
            <DataTable data={data} columns={columns} />
          </CardContent>
        </TabsContent>

        <TabsContent value="past">
          <CardContent className="text-muted-foreground text-sm">
            Coming soon: Past performance metrics
          </CardContent>
        </TabsContent>

        <TabsContent value="team">
          <CardContent className="text-muted-foreground text-sm">
            Coming soon: Team breakdown
          </CardContent>
        </TabsContent>
      </Card>
    </Tabs>
  )
}