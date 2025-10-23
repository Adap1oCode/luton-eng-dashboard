// src/components/admin/table-docs-monitor.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Database, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: number;
  lastRefresh?: string;
}

interface TroubleshootingIssue {
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  solution: string;
  affected_tables?: string[];
}

export function TableDocsMonitor() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [issues, setIssues] = useState<TroubleshootingIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/admin/table-docs-health');
      const data = await response.json();
      
      if (data.status === 'healthy') {
        setHealthStatus({ status: 'healthy', issues: 0, lastRefresh: data.lastRefresh });
      } else {
        setHealthStatus({ status: 'degraded', issues: data.issues?.length || 1 });
      }
    } catch (error) {
      setHealthStatus({ status: 'unhealthy', issues: 1 });
    }
  };

  const fetchDetailedIssues = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/table-docs-health');
      const data = await response.json();
      setIssues(data.issues || []);
    } catch (error) {
      console.error('Failed to fetch detailed issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshDocumentation = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/admin/refresh-table-docs', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        await fetchHealthStatus();
        await fetchDetailedIssues();
      }
    } catch (error) {
      console.error('Failed to refresh documentation:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    fetchDetailedIssues();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Database className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Table Documentation Monitor
          </CardTitle>
          <CardDescription>
            Monitor the health and performance of your database documentation system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Overview */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {healthStatus && getStatusIcon(healthStatus.status)}
              <div>
                <p className="font-medium capitalize">{healthStatus?.status || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">
                  {healthStatus?.issues || 0} issues detected
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHealthStatus}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Check Status
              </Button>
              <Button
                size="sm"
                onClick={refreshDocumentation}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Docs
              </Button>
            </div>
          </div>

          {/* Last Refresh Info */}
          {healthStatus?.lastRefresh && (
            <div className="text-sm text-muted-foreground">
              Last refreshed: {new Date(healthStatus.lastRefresh).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issues List */}
      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Issues & Recommendations</CardTitle>
            <CardDescription>
              Detailed analysis of potential problems and solutions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {issues.map((issue, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(issue.severity)}>
                          {issue.severity}
                        </Badge>
                        <span className="font-medium">{issue.issue}</span>
                      </div>
                      <p className="text-sm">{issue.description}</p>
                      <p className="text-sm font-medium text-blue-600">
                        Solution: {issue.solution}
                      </p>
                      {issue.affected_tables && issue.affected_tables.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Affected tables: {issue.affected_tables.join(', ')}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common maintenance tasks for the documentation system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => window.open('/api/db-docs', '_blank')}
            >
              View Documentation API
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open('/api/admin/refresh-table-docs', '_blank')}
            >
              Check Refresh Stats
            </Button>
            <Button
              variant="outline"
              onClick={fetchDetailedIssues}
              disabled={loading}
            >
              Run Full Diagnostics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
