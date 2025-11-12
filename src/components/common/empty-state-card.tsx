import { type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type EmptyStateCardProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  illustration?: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
};

/**
 * Standard empty state card for placeholder routes and unloaded views.
 */
export function EmptyStateCard({
  title,
  description,
  icon,
  illustration,
  actions,
  className,
  contentClassName,
}: EmptyStateCardProps) {
  return (
    <Card className={cn("border-dashed border-border/60 bg-muted/40", className)}>
      <CardHeader className="flex flex-col items-center space-y-4 text-center">
        {icon ? <div className="rounded-full border border-border/60 bg-background p-3 text-foreground/80">{icon}</div> : null}
        <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
        {description ? <CardDescription className="text-base">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn("flex flex-col items-center gap-6", contentClassName)}>
        {illustration}
      </CardContent>
      {actions ? <CardFooter className="flex justify-center gap-3">{actions}</CardFooter> : null}
    </Card>
  );
}
