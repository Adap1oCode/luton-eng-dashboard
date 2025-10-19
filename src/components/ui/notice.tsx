"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils"; // if you have it; otherwise remove cn() and classes

type Variant = "error" | "success" | "warning" | "info";

export type NoticeOptions = {
  title?: string;
  message?: React.ReactNode;
  variant?: Variant;
  /** Optional primary action */
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  /** Hide the cancel/close button (not typical) */
  hideClose?: boolean;
};

type Ctx = {
  open: (opts: NoticeOptions) => void;
  close: () => void;
};

const NoticeCtx = React.createContext<Ctx | null>(null);

export function useNotice() {
  const ctx = React.useContext(NoticeCtx);
  if (!ctx) throw new Error("useNotice must be used within <NoticeProvider />");
  return ctx;
}

export function NoticeProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [opts, setOpts] = React.useState<NoticeOptions>({
    title: "",
    message: "",
    variant: "info",
  });

  const api = React.useMemo<Ctx>(
    () => ({
      open(next) {
        setOpts({
          title: next.title ?? defaultTitle(next.variant),
          message: next.message ?? "",
          variant: next.variant ?? "info",
          actionLabel: next.actionLabel,
          onAction: next.onAction,
          hideClose: next.hideClose,
        });
        setIsOpen(true);
      },
      close() {
        setIsOpen(false);
      },
    }),
    []
  );

  return (
    <NoticeCtx.Provider value={api}>
      {children}
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent
          className={cn(
            "sm:max-w-[500px]",
            variantRing(opts.variant ?? "info")
          )}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{opts.title}</AlertDialogTitle>
            {opts.message ? (
              <AlertDialogDescription className="whitespace-pre-wrap">
                {opts.message}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            {opts.actionLabel && opts.onAction ? (
              <AlertDialogAction
                onClick={async () => {
                  await opts.onAction?.();
                  setIsOpen(false);
                }}
              >
                {opts.actionLabel}
              </AlertDialogAction>
            ) : null}
            {!opts.hideClose && (
              <AlertDialogCancel>Close</AlertDialogCancel>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </NoticeCtx.Provider>
  );
}

function defaultTitle(variant?: Variant) {
  switch (variant) {
    case "error":
      return "Something went wrong";
    case "success":
      return "Success";
    case "warning":
      return "Please double-check";
    default:
      return "Notice";
  }
}

function variantRing(variant: Variant) {
  switch (variant) {
    case "error":
      return "ring-2 ring-destructive/30";
    case "success":
      return "ring-2 ring-emerald-400/30";
    case "warning":
      return "ring-2 ring-amber-400/30";
    case "info":
    default:
      return "ring-2 ring-primary/20";
  }
}
