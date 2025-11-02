// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/{{routeSegment}}/[id]/page.tsx
// TYPE: Next.js App Router Page (Server Component)
// PURPOSE: View {{resourceTitle}} record details
// -----------------------------------------------------------------------------

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchResourceById } from "@/lib/data/resource-fetch";
import { RESOURCE_TITLE, API_ENDPOINT } from "../../constants";
import { {{pascalCase(routeSegment)}}DetailClient } from "./{{routeSegment}}-detail-client";

// 🧾 Browser tab title for this screen
export const metadata: Metadata = {
  title: `{{resourceTitle}} Details`,
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function {{pascalCase(resourceKey)}}DetailPage({ params }: PageProps) {
  const { id } = await params;
  
  // Fetch the record by ID
  const record = await fetchResourceById({
    endpoint: API_ENDPOINT,
    id,
  });

  if (!record) {
    notFound();
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{{resourceTitle}} Details</h1>
        <p className="mt-1 text-sm text-gray-600">
          View details for {{resourceTitle}} record
        </p>
      </div>
      
      <{{pascalCase(routeSegment)}}DetailClient record={record} />
    </div>
  );
}
