import Link from "next/link";

import { LayoutDashboard } from "lucide-react";

import { EmptyStateCard } from "@/components/common/empty-state-card";
import { Button } from "@/components/ui/button";

export default function DashboardLandingPage() {
  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-4 py-16">
      <EmptyStateCard
        className="w-full max-w-2xl border-border"
        title="Select a dashboard to get started"
        description="Choose a view from the sidebar to explore requisitions, performance, or inventory insights."
        icon={<LayoutDashboard className="h-8 w-8" />}
        actions={
          <Button asChild size="sm">
            <Link href="/dashboard/default">Open default dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
