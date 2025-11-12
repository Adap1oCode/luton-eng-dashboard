// Test endpoint to verify logging works
import { NextResponse } from "next/server";
import { logger } from "@/lib/obs/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const log = logger.child({ evt: "test_log", service: "luton-eng-dashboard" });
  
  // Test different log levels with explicit service name
  log.info({ 
    msg: "Test info log - this should appear in Grafana Loki",
    timestamp: new Date().toISOString(),
  });
  log.warn({ 
    msg: "Test warning log",
    timestamp: new Date().toISOString(),
  });
  log.error({ 
    msg: "Test error log",
    timestamp: new Date().toISOString(),
  });
  
  // Also test console.log to compare
  console.log("Console.log test - this should also appear");
  console.error("Console.error test");
  
  return NextResponse.json({
    message: "Logs sent! Check Grafana Loki (query: {service='luton-eng-dashboard'}) or your terminal.",
    timestamp: new Date().toISOString(),
    note: "This endpoint generates test logs to verify logging is working.",
    lokiEnabled: process.env.LOG_ENABLE_LOKI === 'true',
    lokiUrl: process.env.LOKI_URL ? 'Set' : 'Not set',
  });
}

