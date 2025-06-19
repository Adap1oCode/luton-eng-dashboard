import { useEffect, useState } from 'react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

interface ValidationResult {
  dashboard: string
  key: string
  label: string
  value: string | number | null
  expected?: number
  status: 'pass' | 'fail'
  filter?: any
  sql?: string
}

export function TileValidationBanner({ dashboardId }: { dashboardId: string }) {
  const [failures, setFailures] = useState<ValidationResult[] | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    fetch('/validation-results.json')
      .then((res) => res.json())
      .then((results: ValidationResult[]) => {
        const failed = results.filter(r => r.dashboard === dashboardId && r.status === 'fail')
        setFailures(failed.length > 0 ? failed : null)
      })
      .catch(() => null)
  }, [dashboardId])

  if (!failures) return null

  return (
    <div className="mb-4 space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Tile validation issues detected</AlertTitle>
        <AlertDescription>
          <p>{failures.length} tile(s) failed baseline checks. See below for details.</p>
        </AlertDescription>
      </Alert>

      {failures.map((f, i) => (
        <pre
          key={i}
          className="bg-red-50 border border-red-200 rounded p-3 text-sm overflow-x-auto text-red-800"
        >
{`❌ ${f.dashboard} > ${f.key}
  → expected: ${f.expected}
  → actual:   ${f.value}
  → sql:      ${f.sql || '[none]'}
  → filter:   ${JSON.stringify(f.filter, null, 2)}
`}
        </pre>
      ))}
    </div>
  )
}
