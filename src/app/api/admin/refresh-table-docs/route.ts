// src/app/api/admin/refresh-table-docs/route.ts
import { NextResponse } from "next/server";
import { refreshTableDocs, getTableDocsStats } from "@/lib/data/resources/dbdocs/refresh-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  try {
    // Refresh the materialized view
    const result = await refreshTableDocs();
    
    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to refresh table documentation", details: result.error },
        { status: 500 }
      );
    }
    
    // Get updated stats
    const stats = await getTableDocsStats();
    
    return NextResponse.json({
      success: true,
      message: "Table documentation refreshed successfully",
      stats,
    });
  } catch (error: any) {
    console.error("Error in refresh-table-docs endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return current stats without refreshing
    const stats = await getTableDocsStats();
    
    return NextResponse.json({
      stats,
    });
  } catch (error: any) {
    console.error("Error getting table docs stats:", error);
    return NextResponse.json(
      { error: "Failed to get stats", details: error.message },
      { status: 500 }
    );
  }
}
