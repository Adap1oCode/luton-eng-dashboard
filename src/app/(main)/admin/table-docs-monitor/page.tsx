// src/app/(main)/admin/table-docs-monitor/page.tsx
import { TableDocsMonitor } from "@/components/admin/table-docs-monitor";

export default function TableDocsMonitorPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Database Documentation Monitor</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and troubleshoot your database documentation system
        </p>
      </div>
      
      <TableDocsMonitor />
    </div>
  );
}
