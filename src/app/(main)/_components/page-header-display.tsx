"use client";

import * as React from "react";
import { usePageHeader } from "@/components/forms/shell/page-header-context";
import { Badge } from "@/components/ui/badge";

export function PageHeaderDisplay() {
  const { title, count } = usePageHeader();

  // Don't render anything if no title is set
  if (!title) {
    return null;
  }

  return (
    <>
      <h1 className="text-base font-medium text-gray-900 dark:text-gray-100">{title}</h1>
      {count !== null && (
        <Badge variant="outline" className="ml-2 bg-white dark:bg-gray-800">
          {count}
        </Badge>
      )}
    </>
  );
}

