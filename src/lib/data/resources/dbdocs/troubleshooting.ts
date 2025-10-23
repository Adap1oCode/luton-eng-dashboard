// src/lib/data/resources/dbdocs/troubleshooting.ts
import { supabaseServer } from "@/lib/supabase-server";

export interface TroubleshootingResult {
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  solution: string;
  affected_tables?: string[];
}

/**
 * Comprehensive troubleshooting for table documentation issues
 */
export async function diagnoseTableDocsIssues(): Promise<TroubleshootingResult[]> {
  const issues: TroubleshootingResult[] = [];
  const supabase = await supabaseServer();
  
  try {
    // Check 1: Materialized view exists and has data
    const { data: viewData, error: viewError } = await supabase
      .from('mv_table_report_combined')
      .select('table_name')
      .limit(1);
    
    if (viewError) {
      issues.push({
        issue: 'Materialized view missing or inaccessible',
        severity: 'critical',
        description: 'The mv_table_report_combined view cannot be accessed',
        solution: 'Run the materialized view creation SQL in Supabase',
        affected_tables: ['ALL']
      });
      return issues; // Can't continue without the view
    }
    
    if (!viewData || viewData.length === 0) {
      issues.push({
        issue: 'Materialized view is empty',
        severity: 'high',
        description: 'The materialized view exists but contains no data',
        solution: 'Run SELECT refresh_table_docs(); to populate the view',
        affected_tables: ['ALL']
      });
    }
    
    // Check 2: Missing tables
    const { data: missingTables } = await supabase
      .rpc('check_missing_table_docs');
    
    if (missingTables && missingTables.length > 0) {
      issues.push({
        issue: 'Tables missing from documentation',
        severity: 'medium',
        description: `${missingTables.length} tables are missing or have incomplete documentation`,
        solution: 'Refresh the materialized view or check if tables were recently created',
        affected_tables: missingTables.map((t: any) => t.missing_table)
      });
    }
    
    // Check 3: Empty column data
    const { data: emptyColumns } = await supabase
      .from('mv_table_report_combined')
      .select('table_name')
      .eq('columns', '[]');
    
    if (emptyColumns && emptyColumns.length > 0) {
      issues.push({
        issue: 'Tables with no column information',
        severity: 'medium',
        description: `${emptyColumns.length} tables have empty column data`,
        solution: 'Check if dbdocs.v_table_columns view is working correctly',
        affected_tables: emptyColumns.map((t: any) => t.table_name)
      });
    }
    
    // Check 4: View freshness
    const { data: freshness } = await supabase
      .rpc('get_view_freshness');
    
    if (freshness && freshness.length > 0) {
      const lastRefresh = new Date(freshness[0].last_refresh);
      const hoursSinceRefresh = (Date.now() - lastRefresh.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceRefresh > 24) {
        issues.push({
          issue: 'Stale documentation data',
          severity: 'low',
          description: `Documentation was last refreshed ${Math.round(hoursSinceRefresh)} hours ago`,
          solution: 'Schedule regular refreshes or refresh manually after schema changes',
          affected_tables: ['ALL']
        });
      }
    }
    
    // Check 5: Performance issues
    const { data: allTables } = await supabase
      .from('mv_table_report_combined')
      .select('table_name, columns, indexes, constraints');
    
    if (allTables) {
      const largeTables = allTables.filter((table: any) => {
        const columnCount = Array.isArray(table.columns) ? table.columns.length : 0;
        const indexCount = Array.isArray(table.indexes) ? table.indexes.length : 0;
        return columnCount > 50 || indexCount > 20;
      });
      
      if (largeTables.length > 0) {
        issues.push({
          issue: 'Large tables detected',
          severity: 'low',
          description: `${largeTables.length} tables have many columns or indexes`,
          solution: 'Consider pagination or lazy loading for these tables in the UI',
          affected_tables: largeTables.map((t: any) => t.table_name)
        });
      }
    }
    
  } catch (error: any) {
    issues.push({
      issue: 'Diagnostic system error',
      severity: 'high',
      description: `Error during diagnosis: ${error.message}`,
      solution: 'Check database connectivity and permissions',
      affected_tables: ['ALL']
    });
  }
  
  return issues;
}

/**
 * Quick health check for monitoring
 */
export async function quickHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: number;
  lastRefresh?: string;
}> {
  try {
    const supabase = await supabaseServer();
    
    // Basic connectivity test
    const { data, error } = await supabase
      .from('mv_table_report_combined')
      .select('table_name')
      .limit(1);
    
    if (error) {
      return { status: 'unhealthy', issues: 1 };
    }
    
    if (!data || data.length === 0) {
      return { status: 'degraded', issues: 1 };
    }
    
    // Check freshness
    const { data: freshness } = await supabase
      .rpc('get_view_freshness');
    
    const lastRefresh = freshness?.[0]?.last_refresh;
    const hoursSinceRefresh = lastRefresh ? 
      (Date.now() - new Date(lastRefresh).getTime()) / (1000 * 60 * 60) : 999;
    
    if (hoursSinceRefresh > 48) {
      return { 
        status: 'degraded', 
        issues: 1,
        lastRefresh: lastRefresh
      };
    }
    
    return { 
      status: 'healthy', 
      issues: 0,
      lastRefresh: lastRefresh
    };
    
  } catch (error) {
    return { status: 'unhealthy', issues: 1 };
  }
}
