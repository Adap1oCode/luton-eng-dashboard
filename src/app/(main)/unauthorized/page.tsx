import Link from "next/link";

import { Lock } from "lucide-react";

import { EmptyStateCard } from "@/components/common/empty-state-card";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="bg-background flex min-h-dvh items-center justify-center px-4 py-16">
      <EmptyStateCard
        className="w-full max-w-lg border-border"
        title="Unauthorized access"
        description="You do not have permission to view this resource. Contact your administrator if you believe this is a mistake."
        icon={<Lock className="h-8 w-8" />}
        actions={
          <Button asChild size="sm">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
