import Link from "next/link";

import { Command } from "lucide-react";

import { AuthHeroPane } from "@/components/auth/auth-hero-pane";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

import { LoginFormV1 } from "./_components/login-form";

export default function LoginV1() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in with your workspace credentials to access the dashboard."
      heroPosition="left"
      hero={
        <AuthHeroPane
          title="Inventory intelligence at your fingertips"
          description="Track requisitions, purchase orders, and performance insights in one place."
          icon={<Command className="h-12 w-12 text-primary-foreground" />}
          highlights={[
            { title: "Real-time visibility", description: "Monitor stock movements and approvals instantly." },
            { title: "Collaborative workflows", description: "Work securely with role-based access controls." },
          ]}
        />
      }
      footer={
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Button asChild variant="link" className="px-0 font-semibold text-primary">
            <Link href="/auth/v1/register">Create one</Link>
          </Button>
        </p>
      }
    >
      <LoginFormV1 />
    </AuthShell>
  );
}
