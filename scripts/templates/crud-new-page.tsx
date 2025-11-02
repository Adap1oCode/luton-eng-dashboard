// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/{{routeSegment}}/new/page.tsx
// TYPE: Next.js App Router Page (Server Component)
// PURPOSE: Create new {{resourceTitle}} record
// -----------------------------------------------------------------------------

import type { Metadata } from "next";
import { RESOURCE_TITLE } from "../constants";
import { {{pascalCase(routeSegment)}}NewClient } from "./{{routeSegment}}-new-client";

// 🧾 Browser tab title for this screen
export const metadata: Metadata = {
  title: `New ${RESOURCE_TITLE}`,
};

export default async function New{{pascalCase(resourceKey)}}Page() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New {{resourceTitle}}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create a new {{resourceTitle}} record
        </p>
      </div>
      
      <{{pascalCase(routeSegment)}}NewClient />
    </div>
  );
}
