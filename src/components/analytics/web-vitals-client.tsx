"use client";

import { useEffect } from "react";
import { reportWebVitals } from "@/lib/analytics/web-vitals";

export function WebVitalsClient() {
  useEffect(() => {
    reportWebVitals();
  }, []);

  return null;
}

