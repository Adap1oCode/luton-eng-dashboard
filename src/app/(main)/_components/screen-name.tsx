"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

function toTitleCase(s: string) {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function humanizeResource(slug: string) {
  // Example: "tally-cards" -> "Tally Cards"
  return toTitleCase(slug);
}

export function ScreenName() {
  const pathname = usePathname() || "/";
  // Expected shapes we support out-of-the-box:
  // /app/(main)/forms/<resource>
  // /app/(main)/forms/<resource>/new
  // /app/(main)/forms/<resource>/<id>/edit
  // /app/(main)/forms/<resource>/<id>
  // You can extend this logic if you have more shapes.
  const parts = pathname.split("/").filter(Boolean);

  // Try to find "forms" segment and read resource after it
  const formsIdx = parts.findIndex((p) => p === "forms");
  const resource = formsIdx >= 0 ? parts[formsIdx + 1] : undefined;

  let mode: "view" | "new" | "edit" | "details" = "view";
  let id: string | undefined;

  if (resource) {
    const afterResource = parts.slice(formsIdx + 2);

    if (afterResource[0] === "new") {
      mode = "new";
    } else if (afterResource.length >= 2 && afterResource[1] === "edit") {
      mode = "edit";
      id = afterResource[0];
    } else if (afterResource.length >= 1) {
      mode = "details";
      id = afterResource[0];
    }
  }

  // Compose a friendly title
  if (resource) {
    const label = humanizeResource(resource);
    switch (mode) {
      case "new":
        return <>New {label}</>;
      case "edit":
        // If you want to show a truncated id, you can slice it here
        return <>Edit {label}{id ? ` ${id.slice(0, 8)}` : ""}</>;
      case "details":
        return <>{label} Details{ id ? ` ${id.slice(0, 8)}` : ""}</>;
      default:
        return <>View {label}</>;
    }
  }

  // Fallback: last path segment
  const last = parts[parts.length - 1] ?? "";
  return <>{last ? toTitleCase(last) : "Dashboard"}</>;
}
