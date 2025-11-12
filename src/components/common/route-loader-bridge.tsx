"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useRouteLoader } from "@/components/providers/app-loader-provider";

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
  const { show, hide, patch } = useRouteLoader();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const loaderIdRef = React.useRef<string | null>(null);
  const startedAtRef = React.useRef<number>(0);
  const settleTimerRef = React.useRef<number>();

  const ensureLoader = React.useCallback(
    (title: string, message?: string) => {
      startedAtRef.current = Date.now();
      const payload = { title, message };
      if (loaderIdRef.current) {
        patch(loaderIdRef.current, payload);
        return loaderIdRef.current;
      }
      const id = show(payload);
      loaderIdRef.current = id;
      return id;
    },
    [show, patch],
  );

  const clearLoader = React.useCallback(() => {
    if (!loaderIdRef.current) return;
    hide(loaderIdRef.current);
    loaderIdRef.current = null;
  }, [hide]);

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

      ensureLoader(anchor.getAttribute("data-loader-title") ?? "Navigating…", anchor.getAttribute("data-loader-message") ?? clickMessage);
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [ensureLoader, clickMessage]);

  React.useEffect(() => {
    const handlePopState = () => {
      ensureLoader("Navigating…", clickMessage);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [ensureLoader, clickMessage]);

  React.useEffect(() => {
    if (!loaderIdRef.current) {
      return;
    }

    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, minVisibleMs - elapsed);
    window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      clearLoader();
    }, remaining);

    return () => {
      window.clearTimeout(settleTimerRef.current);
    };
  }, [pathname, searchParams?.toString(), minVisibleMs, clearLoader]);

  React.useEffect(() => {
    return () => {
      window.clearTimeout(settleTimerRef.current);
      clearLoader();
    };
  }, [clearLoader]);

  return null;
}
