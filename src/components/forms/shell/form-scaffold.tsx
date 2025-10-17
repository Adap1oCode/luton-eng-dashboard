// src/components/forms/shell/form-scaffold.tsx
import * as React from "react";

type FormScaffoldProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

/**
 * Centers the page, renders a title block, and leaves room
 * for one or more SectionCards below. No tabs; no right panel.
 */
export default function FormScaffold({ title, subtitle, children }: FormScaffoldProps) {
  return (
    <div className="w-full">
      {/* Page header */}
      <div className="mx-auto max-w-6xl px-6 pt-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p> : null}
      </div>

      {/* Sections container */}
      <div className="mx-auto max-w-6xl px-6 pt-4 pb-10 lg:px-8">{children}</div>
    </div>
  );
}
