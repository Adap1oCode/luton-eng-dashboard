import type { Metadata } from "next";
import PerformanceDashboard from "@/components/performance/performance-dashboard";

export const metadata: Metadata = {
  title: "Performance Monitoring",
  description: "Real-time performance metrics and monitoring dashboard",
};

export default function PerformancePage() {
  return <PerformanceDashboard />;
}
