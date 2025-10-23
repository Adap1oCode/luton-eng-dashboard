"use client";
import { useEffect, useRef, useState } from "react";

import { usePathname, useSearchParams } from "next/navigation";

import { APP_CONFIG } from "@/config/app-config";

type Props = {
  minDurationMs?: number;
  title?: string;
};

export default function RouteTransitionOverlay({ minDurationMs = 300, title = APP_CONFIG.name }: Props) {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const params = useSearchParams();
  const timeoutIdRef = useRef<number>(0);

  useEffect(() => {
    setVisible(true);
    window.clearTimeout(timeoutIdRef.current);
    timeoutIdRef.current = window.setTimeout(() => setVisible(false), minDurationMs);
    return () => window.clearTimeout(timeoutIdRef.current);
  }, [pathname, params.toString(), minDurationMs]);

  if (!visible) return null;

  return (
    <div className="bg-background/60 fixed inset-0 z-50 backdrop-blur-sm">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="bg-card flex items-center gap-2 rounded-md border px-4 py-2 shadow">
          <span className="relative inline-flex h-4 w-4">
            <span className="border-primary/30 h-4 w-4 rounded-full border-2" />
            <span className="border-primary absolute inset-0 animate-spin rounded-full border-t-2" />
          </span>
          <span className="text-sm font-medium">{title}</span>
        </div>
      </div>
    </div>
  );
}
