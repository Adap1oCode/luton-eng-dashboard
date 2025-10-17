"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type SectionCardProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export default function SectionCard({ title, defaultOpen = true, children }: SectionCardProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="mb-6 rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((s) => !s)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {open && <div className="p-6 lg:p-8">{children}</div>}
    </div>
  );
}
