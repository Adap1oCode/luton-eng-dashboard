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
    <div className="bg-card mb-6 rounded-2xl border shadow-sm">
      <div className="flex items-start gap-4 p-6">
        {/* Icon chip */}
        <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <FileText className="text-muted-foreground h-5 w-5" />
        </div>

        {/* Title + description */}
        <div className="flex-1">
          <h2 className="text-base leading-6 font-semibold">{title}</h2>
          {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}
