// src/components/forms/shell/form-intro-card.tsx
"use client";

import * as React from "react";
import { FileText } from "lucide-react"; // same icon family as Requisition

type FormIntroCardProps = {
  title: string;
  description?: string;
};

export default function FormIntroCard({ title, description }: FormIntroCardProps) {
  return (
    <div className="mb-6 rounded-2xl border bg-card shadow-sm">
      <div className="flex items-start gap-4 p-6">
        {/* Icon chip */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Title + description */}
        <div className="flex-1">
          <h2 className="text-base font-semibold leading-6">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
