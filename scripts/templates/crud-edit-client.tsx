// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/{{routeSegment}}/[id]/edit/{{routeSegment}}-edit-client.tsx
// TYPE: Client Component
// PURPOSE: Edit {{resourceTitle}} form
// -----------------------------------------------------------------------------

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { API_ENDPOINT } from "../../../constants";

// Form validation schema
const {{camelCase(resourceKey)}}FormSchema = z.object({
  {{#each formFields}}
  {{field}}: {{#if (eq type "string")}}z.string(){{else if (eq type "number")}}z.number(){{else if (eq type "boolean")}}z.boolean(){{else}}z.string(){{/if}}{{#if required}}.min(1, "{{field}} is required"){{/if}},
  {{/each}}
});

type {{pascalCase(resourceKey)}}FormData = z.infer<typeof {{camelCase(resourceKey)}}FormSchema>;

interface {{pascalCase(resourceKey)}}EditClientProps {
  record: any; // Will be typed properly based on resource schema
}

export function {{pascalCase(routeSegment)}}EditClient({ record }: {{pascalCase(resourceKey)}}EditClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<{{pascalCase(resourceKey)}}FormData>({
    resolver: zodResolver({{camelCase(resourceKey)}}FormSchema),
    defaultValues: {
      {{#each formFields}}
      {{field}}: record.{{field}} || {{#if (eq type "string")}}""{{else if (eq type "number")}}0{{else if (eq type "boolean")}}false{{else}}""{{/if}},
      {{/each}}
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {{pascalCase(resourceKey)}}FormData) => {
      const response = await fetch(`${API_ENDPOINT}/${record.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update {{resourceTitle}}");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["{{resourceKey}}"] });
      toast.success("{{resourceTitle}} updated successfully");
      router.push(`/forms/{{routeSegment}}/${record.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: {{pascalCase(resourceKey)}}FormData) => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit {{resourceTitle}}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {{#each formFields}}
            <FormField
              control={form.control}
              name="{{field}}"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{{titleCase field}}</FormLabel>
                  <FormControl>
                    {{#if (eq type "string")}}
                    <Input placeholder="Enter {{field}}" {...field} />
                    {{else if (eq type "number")}}
                    <Input type="number" placeholder="Enter {{field}}" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    {{else if (eq type "boolean")}}
                    <Select onValueChange={(value) => field.onChange(value === "true")} value={field.value ? "true" : "false"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select {{field}}" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                    {{else}}
                    <Textarea placeholder="Enter {{field}}" {...field} />
                    {{/if}}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {{/each}}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/forms/{{routeSegment}}/${record.id}`)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update {{resourceTitle}}"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
