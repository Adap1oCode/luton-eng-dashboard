import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthHeroPaneProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  highlights?: Array<{ title: string; description?: string }>;
  className?: string;
};

/**
 * Decorative hero pane for authentication pages.
 * Keeps typography + spacing consistent while allowing bespoke messaging.
 */
export function AuthHeroPane({ title, description, icon, highlights, className }: AuthHeroPaneProps) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary-foreground/40 px-10 py-16 text-primary-foreground",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_transparent_65%)]" />
      <div className="relative z-10 flex max-w-md flex-col items-center gap-8 text-center">
        {icon ? <div className="rounded-full border border-primary-foreground/30 bg-primary-foreground/10 p-4">{icon}</div> : null}
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="text-base text-primary-foreground/80">{description}</p> : null}
        </div>
        {highlights && highlights.length > 0 ? (
          <ul className="flex w-full flex-col gap-4 text-left text-sm text-primary-foreground/80">
            {highlights.map(({ title: highlightTitle, description: highlightDescription }) => (
              <li key={highlightTitle} className="rounded-lg border border-primary-foreground/10 bg-primary-foreground/5 p-4">
                <p className="font-medium text-primary-foreground">{highlightTitle}</p>
                {highlightDescription ? <p className="mt-1 text-xs leading-relaxed">{highlightDescription}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
