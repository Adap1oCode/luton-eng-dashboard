import Link from "next/link";

import { Command } from "lucide-react";

import { AuthHeroPane } from "@/components/auth/auth-hero-pane";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

import { RegisterFormV1 } from "./_components/register-form";

export default function RegisterV1() {
  return (
    <AuthShell
      title="Create your account"
      description="Join the workspace to collaborate on requisitions, approvals, and inventory controls."
      heroPosition="right"
      hero={
        <AuthHeroPane
          title="Built for modern operations"
          description="From field entries to executive dashboards, keep teams aligned with trusted data."
          icon={<Command className="h-12 w-12 text-primary-foreground" />}
          highlights={[
            { title: "Faster onboarding", description: "Pre-configured permissions get teams productive immediately." },
            { title: "Secure by design", description: "Multi-tenant roles and audit logging keep access controlled." },
          ]}
        />
      }
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Button asChild variant="link" className="px-0 font-semibold text-primary">
            <Link href="/auth/v1/login">Sign in</Link>
          </Button>
        </p>
      }
    >
      <RegisterFormV1 />
    </AuthShell>
  );
}
