"use client";

import { useEffect, useState } from "react";

import { APP_CONFIG } from "@/config/app-config";

type Props = { children: React.ReactNode };

export default function InitialLoadGate({ children }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      const done = sessionStorage.getItem("__initial_loaded__");
      if (done) {
        setVisible(false);
        return;
      }
      const finish = () => {
        sessionStorage.setItem("__initial_loaded__", "1");
        setVisible(false);
      };
      const onReady = () => setTimeout(finish, 700);

      if (document.readyState === "complete") {
        onReady();
      } else {
        window.addEventListener("load", onReady, { once: true });
        return () => window.removeEventListener("load", onReady);
      }
    } catch {
      setVisible(false);
    }
  }, []);

  return (
    <>
      {children}
      {visible ? (
        <div className="bg-background fixed inset-0 z-[1000] flex items-center justify-center">
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <div className="border-primary/30 size-14 rounded-full border-2" />
              <div className="border-primary absolute inset-0 animate-spin rounded-full border-t-2" />
            </div>
            <div className="text-center">
              <div className="text-foreground text-lg font-semibold">{APP_CONFIG.meta.title || APP_CONFIG.name}</div>
              <div className="text-muted-foreground text-sm">Loading…</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
