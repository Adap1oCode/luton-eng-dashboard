import { type ReactNode } from "react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  hero?: ReactNode;
  heroPosition?: "left" | "right";
  className?: string;
  containerClassName?: string;
};

/**
 * Shared shell for authentication flows.
 * Ensures pages inherit consistent spacing, responsive behaviour, and shadcn/tweakcn tokens.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
  hero,
  heroPosition = "left",
  className,
  containerClassName,
}: AuthShellProps) {
  const heroSection =
    hero &&
    (
      <aside className="relative hidden overflow-hidden rounded-none border-l border-border bg-muted lg:flex">
        <div className="flex h-full w-full items-center justify-center">{hero}</div>
      </aside>
    );

  return (
    <div className="bg-background">
      <div className={cn("mx-auto flex min-h-dvh w-full flex-col lg:grid lg:grid-cols-2", containerClassName)}>
        {heroPosition === "left" && heroSection}
        <section className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12">
          <Card className="w-full max-w-md border-border shadow-sm">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-3xl font-semibold tracking-tight">{title}</CardTitle>
              {description ? <CardDescription className="text-base">{description}</CardDescription> : null}
            </CardHeader>
            <CardContent className={cn("space-y-6", className)}>{children}</CardContent>
            {footer ? <CardFooter className="justify-center border-t border-border bg-muted/30 py-6">{footer}</CardFooter> : null}
          </Card>
        </section>
        {heroPosition === "right" && heroSection}
      </div>
    </div>
  );
}
