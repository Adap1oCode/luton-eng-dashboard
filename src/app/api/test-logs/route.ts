// Test endpoint to verify logging works
import { NextResponse } from "next/server";
import { logger } from "@/lib/obs/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const log = logger.child({ evt: "test_log" });
  
  // Test different log levels
  log.info({ msg: "Test info log - this should appear in Vercel Logs" });
  log.warn({ msg: "Test warning log" });
  log.error({ msg: "Test error log" });
  
  // Also test console.log to compare
  console.log("Console.log test - this should also appear");
  console.error("Console.error test");
  
  return NextResponse.json({
    message: "Logs sent! Check Vercel Logs tab or your terminal.",
    timestamp: new Date().toISOString(),
    note: "This endpoint generates test logs to verify logging is working.",
  });
}

