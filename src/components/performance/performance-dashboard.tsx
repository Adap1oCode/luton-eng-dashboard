'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { usePerformanceMonitoring } from '@/hooks/use-performance-monitoring'
import { performanceMonitor } from '@/lib/react-query'
import { checkPerformanceBudgets, PERFORMANCE_BUDGETS } from '@/hooks/use-performance-monitoring'
import { checkReactQueryBudgets } from '@/lib/react-query-performance'

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<any>(null)
  const [reactQueryMetrics, setReactQueryMetrics] = useState<any>(null)
  const [budgetResults, setBudgetResults] = useState<any>(null)
  const { getMetrics } = usePerformanceMonitoring()

  useEffect(() => {
    const updateMetrics = () => {
      const perfMetrics = getMetrics()
      const rqMetrics = performanceMonitor.getMetrics()
      const budgets = checkPerformanceBudgets(perfMetrics)
      const rqBudgets = checkReactQueryBudgets(rqMetrics)

      setMetrics(perfMetrics)
      setReactQueryMetrics(rqMetrics)
      setBudgetResults({ performance: budgets, reactQuery: rqBudgets })
    }

    // Update metrics immediately
    updateMetrics()

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000)

    return () => clearInterval(interval)
  }, [getMetrics])

  if (!metrics || !reactQueryMetrics) {
    return <div>Loading performance metrics...</div>
  }

  const getScoreColor = (score: number, thresholds: { good: number; needsImprovement: number }) => {
    if (score <= thresholds.good) return 'text-green-600'
    if (score <= thresholds.needsImprovement) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadge = (score: number, thresholds: { good: number; needsImprovement: number }) => {
    if (score <= thresholds.good) return <Badge className="bg-green-100 text-green-800">Good</Badge>
    if (score <= thresholds.needsImprovement) return <Badge className="bg-yellow-100 text-yellow-800">Needs Improvement</Badge>
    return <Badge className="bg-red-100 text-red-800">Poor</Badge>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Performance Dashboard</h1>
        <Button onClick={() => window.location.reload()}>Refresh</Button>
      </div>

      {/* Core Web Vitals */}
      <Card>
        <CardHeader>
          <CardTitle>Core Web Vitals</CardTitle>
          <CardDescription>Google's Core Web Vitals metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* CLS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Cumulative Layout Shift (CLS)</span>
                {getScoreBadge(metrics.cls || 0, { good: 0.1, needsImprovement: 0.25 })}
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(metrics.cls || 0, { good: 0.1, needsImprovement: 0.25 })}`}>
                {metrics.cls?.toFixed(3) || 'N/A'}
              </div>
              <Progress 
                value={Math.min((metrics.cls || 0) * 100, 100)} 
                className="h-2"
              />
              <p className="text-sm text-gray-600">Good: ≤0.1, Needs Improvement: ≤0.25</p>
            </div>

            {/* FID */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">First Input Delay (FID)</span>
                {getScoreBadge(metrics.fid || 0, { good: 100, needsImprovement: 300 })}
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(metrics.fid || 0, { good: 100, needsImprovement: 300 })}`}>
                {metrics.fid?.toFixed(1) || 'N/A'}ms
              </div>
              <Progress 
                value={Math.min((metrics.fid || 0) / 3, 100)} 
                className="h-2"
              />
              <p className="text-sm text-gray-600">Good: ≤100ms, Needs Improvement: ≤300ms</p>
            </div>

            {/* LCP */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Largest Contentful Paint (LCP)</span>
                {getScoreBadge(metrics.lcp || 0, { good: 2500, needsImprovement: 4000 })}
              </div>
              <div className={`text-2xl font-bold ${getScoreColor(metrics.lcp || 0, { good: 2500, needsImprovement: 4000 })}`}>
                {metrics.lcp?.toFixed(1) || 'N/A'}ms
              </div>
              <Progress 
                value={Math.min((metrics.lcp || 0) / 40, 100)} 
                className="h-2"
              />
              <p className="text-sm text-gray-600">Good: ≤2.5s, Needs Improvement: ≤4.0s</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* React Query Performance */}
      <Card>
        <CardHeader>
          <CardTitle>React Query Performance</CardTitle>
          <CardDescription>Caching and query performance metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <span className="font-medium">Cache Hit Rate</span>
              <div className="text-2xl font-bold text-blue-600">
                {((reactQueryMetrics.cacheHits / (reactQueryMetrics.cacheHits + reactQueryMetrics.cacheMisses)) * 100).toFixed(1)}%
              </div>
              <Progress 
                value={(reactQueryMetrics.cacheHits / (reactQueryMetrics.cacheHits + reactQueryMetrics.cacheMisses)) * 100} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <span className="font-medium">Total Queries</span>
              <div className="text-2xl font-bold text-blue-600">
                {reactQueryMetrics.queryCount}
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-medium">Avg Query Time</span>
              <div className="text-2xl font-bold text-blue-600">
                {reactQueryMetrics.averageQueryTime.toFixed(1)}ms
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-medium">Stale Queries</span>
              <div className="text-2xl font-bold text-orange-600">
                {reactQueryMetrics.staleQueries}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Budgets */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Budgets</CardTitle>
          <CardDescription>Performance threshold violations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Overall Performance</span>
              {budgetResults?.performance.passed ? (
                <Badge className="bg-green-100 text-green-800">All Budgets Met</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">Budget Violations</Badge>
              )}
            </div>

            {budgetResults?.performance.violations.length > 0 && (
              <div className="space-y-2">
                <span className="font-medium text-red-600">Performance Violations:</span>
                <ul className="list-disc list-inside space-y-1">
                  {budgetResults.performance.violations.map((violation: string, index: number) => (
                    <li key={index} className="text-sm text-red-600">{violation}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="font-medium">React Query Performance</span>
              {budgetResults?.reactQuery.passed ? (
                <Badge className="bg-green-100 text-green-800">All Budgets Met</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">Budget Violations</Badge>
              )}
            </div>

            {budgetResults?.reactQuery.violations.length > 0 && (
              <div className="space-y-2">
                <span className="font-medium text-red-600">React Query Violations:</span>
                <ul className="list-disc list-inside space-y-1">
                  {budgetResults.reactQuery.violations.map((violation: string, index: number) => (
                    <li key={index} className="text-sm text-red-600">{violation}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Custom Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Metrics</CardTitle>
          <CardDescription>Application-specific performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <span className="font-medium">API Response Time</span>
              <div className="text-2xl font-bold text-blue-600">
                {metrics.apiResponseTime || 'N/A'}ms
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-medium">Render Time</span>
              <div className="text-2xl font-bold text-blue-600">
                {metrics.renderTime || 'N/A'}ms
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-medium">Memory Usage</span>
              <div className="text-2xl font-bold text-blue-600">
                {metrics.memoryUsage?.toFixed(1) || 'N/A'}MB
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-medium">TTFB</span>
              <div className="text-2xl font-bold text-blue-600">
                {metrics.ttfb?.toFixed(1) || 'N/A'}ms
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
