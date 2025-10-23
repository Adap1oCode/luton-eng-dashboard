// src/lib/data/resources/dbdocs/refresh-utils.ts
import { supabaseServer } from "@/lib/supabase-server";

/**
 * Refresh the materialized view for table documentation
 * Call this after schema changes or on a schedule
 */
export async function refreshTableDocs(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await supabaseServer();
    
    const { error } = await supabase.rpc('refresh_table_docs');
    
    if (error) {
      console.error('Failed to refresh table docs:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Table documentation refreshed successfully');
    return { success: true };
  } catch (err: any) {
    console.error('Error refreshing table docs:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get table documentation stats (useful for monitoring)
 */
export async function getTableDocsStats(): Promise<{
  total_tables: number;
  last_refresh: string | null;
  view_size: string | null;
}> {
  try {
    const supabase = await supabaseServer();
    
    // Get count of tables
    const { count: total_tables } = await supabase
      .from('mv_table_report_combined')
      .select('*', { count: 'exact', head: true });
    
    // Get view size and last refresh info
    const { data: stats } = await supabase
      .rpc('get_table_docs_stats');
    
    return {
      total_tables: total_tables ?? 0,
      last_refresh: stats?.[0]?.last_refresh ?? null,
      view_size: stats?.[0]?.view_size ?? null,
    };
  } catch (err: any) {
    console.error('Error getting table docs stats:', err);
    return {
      total_tables: 0,
      last_refresh: null,
      view_size: null,
    };
  }
}
