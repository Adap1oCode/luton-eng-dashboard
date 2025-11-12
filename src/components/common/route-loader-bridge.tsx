"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useLoaderNavigation } from "@/components/providers/app-loader-provider";

interface RouteLoaderBridgeProps {
  minVisibleMs?: number;
  clickMessage?: string;
}

function isModifiedEvent(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

export default function RouteLoaderBridge({
  minVisibleMs = 300,
  clickMessage = "Loading next page...",
}: RouteLoaderBridgeProps) {
  const { startNavigation, endNavigation } = useLoaderNavigation({
    message: clickMessage,
  });
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const settleTimerRef = React.useRef<number>();

  React.useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedEvent(event)) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.getAttribute("rel") === "external") {
        return;
      }

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) {
        return;
      }

      startNavigation({
        title: anchor.getAttribute("data-loader-title") ?? undefined,
        message: anchor.getAttribute("data-loader-message") ?? clickMessage,
      });
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [startNavigation, clickMessage]);

  React.useEffect(() => {
    const handlePopState = () => {
      startNavigation({ message: clickMessage });
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [startNavigation, clickMessage]);

  React.useEffect(() => {
    window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      endNavigation();
    }, Math.max(minVisibleMs, 0));

    return () => {
      window.clearTimeout(settleTimerRef.current);
    };
  }, [pathname, searchParams?.toString(), minVisibleMs, endNavigation]);

  React.useEffect(() => {
    return () => {
      window.clearTimeout(settleTimerRef.current);
      endNavigation();
    };
  }, [endNavigation]);

  return null;
}
