"use client";

import { Button } from "@/components/ui/button";

type Props = {
  onCancel: () => void | Promise<void>;
  onSave: () => void | Promise<void>;
  isSaving?: boolean;
};

export default function FooterActions({ onCancel, onSave, isSaving }: Props) {
  // Layout kept intentionally minimal and neutral so it matches Shadcn/Tangerine defaults.
  // If your original footer had extra controls (e.g., toggles), you can add them here 1:1.
  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" type="button" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" onClick={onSave} disabled={!!isSaving}>
        {isSaving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
