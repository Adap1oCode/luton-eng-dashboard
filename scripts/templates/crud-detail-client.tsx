// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/{{routeSegment}}/[id]/{{routeSegment}}-detail-client.tsx
// TYPE: Client Component
// PURPOSE: Display {{resourceTitle}} record details
// -----------------------------------------------------------------------------

"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface {{pascalCase(resourceKey)}}DetailClientProps {
  record: any; // Will be typed properly based on resource schema
}

export function {{pascalCase(routeSegment)}}DetailClient({ record }: {{pascalCase(resourceKey)}}DetailClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{{resourceTitle}} Details</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/forms/{{routeSegment}}/${record.id}/edit`)}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/forms/{{routeSegment}}")}
              >
                Back to List
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {{#each displayFields}}
            <div>
              <label className="text-sm font-medium text-gray-500">{{titleCase field}}</label>
              <div className="mt-1">
                {{#if (eq type "boolean")}}
                <Badge variant={record.{{field}} ? "default" : "secondary"}>
                  {record.{{field}} ? "Yes" : "No"}
                </Badge>
                {{else if (eq type "date")}}
                <p className="text-sm text-gray-900">
                  {record.{{field}} ? format(new Date(record.{{field}}), "PPP") : "N/A"}
                </p>
                {{else}}
                <p className="text-sm text-gray-900">
                  {record.{{field}} || "N/A"}
                </p>
                {{/if}}
              </div>
            </div>
            {{/each}}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
