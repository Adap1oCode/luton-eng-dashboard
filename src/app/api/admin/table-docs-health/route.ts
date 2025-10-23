// src/app/api/admin/table-docs-health/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    // Comprehensive health check
    const healthChecks = await Promise.allSettled([
      // 1. Check if materialized view exists and is accessible
      supabase
        .from('mv_table_report_combined')
        .select('table_name')
        .limit(1),
      
      // 2. Check if underlying dbdocs views exist
      supabase
        .from('dbdocs.v_table_columns')
        .select('table_name')
        .limit(1),
      
      // 3. Get view statistics
      supabase
        .rpc('get_table_docs_stats'),
      
      // 4. Check for any tables missing documentation
      supabase
        .rpc('check_missing_table_docs'),
      
      // 5. Check view freshness (when was it last refreshed)
      supabase
        .rpc('get_view_freshness')
    ]);
    
    const results = healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { check: `check_${index + 1}`, status: 'ok', data: result.value.data };
      } else {
        return { 
          check: `check_${index + 1}`, 
          status: 'error', 
          error: result.reason?.message || 'Unknown error' 
        };
      }
    });
    
    // Overall health status
    const hasErrors = results.some(r => r.status === 'error');
    const overallStatus = hasErrors ? 'degraded' : 'healthy';
    
    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
      recommendations: generateRecommendations(results)
    });
    
  } catch (error: any) {
    console.error("Error in table-docs-health endpoint:", error);
    return NextResponse.json(
      { 
        status: 'error',
        error: "Health check failed", 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(results: any[]): string[] {
  const recommendations: string[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'error') {
      switch (index) {
        case 0:
          recommendations.push("Materialized view is missing or inaccessible. Run the materialized view creation SQL.");
          break;
        case 1:
          recommendations.push("Underlying dbdocs views are missing. Check if dbdocs schema and views exist.");
          break;
        case 2:
          recommendations.push("Stats function is missing. Run the stats function creation SQL.");
          break;
        case 3:
          recommendations.push("Missing table docs check function. Some tables may not have documentation.");
          break;
        case 4:
          recommendations.push("View freshness check failed. Consider refreshing the materialized view.");
          break;
      }
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push("All systems healthy. Consider scheduling regular refreshes.");
  }
  
  return recommendations;
}
