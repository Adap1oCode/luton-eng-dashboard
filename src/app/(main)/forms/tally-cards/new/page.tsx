"use client";
// cspell:words hashdiff cardUID

import React, { useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { PageHeader } from "@/components/data-table/page-header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  tallyCardNumber: z.string().min(1, "Required"),
  itemNumber: z.string().min(1, "Required"),
  warehouse: z.string().min(1, "Required"),
  note: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  snapshotAt: z.date().optional(),
});

export default function NewTallyCardPage() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tallyCardNumber: "",
      itemNumber: "",
      warehouse: "",
      note: "",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      snapshotAt: undefined,
    },
  });

  // Mock warehouses list (replace with API fetch)
  const warehouses = [
    { value: "RTZ", label: "RTZ Warehouse" },
    { value: "BDI", label: "BDI Warehouse" },
    { value: "CCW", label: "CCW Warehouse" },
  ];

  // Mock readonly fields
  const [cardUID] = useState("auto-generated-uuid");
  const [hashdiff] = useState("auto-hash");

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log("Saving tally card:", values);
    router.push("/forms/tally-cards");
  };

  return (
    <div className="min-h-screen space-y-8 bg-gray-50 p-6 dark:bg-gray-900">
      {/* Section 1: Header */}
      <section>
        <PageHeader title="Create New Tally Card" />
      </section>

      {/* Section 2: Readonly Details */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold">Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Card UID (Readonly)</Label>
            <Input value={cardUID} disabled />
          </div>
          <div>
            <Label>Hash Diff (Readonly)</Label>
            <Input value={hashdiff} disabled />
          </div>
        </div>
      </section>

      {/* Section 3: Basic Information */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold">Basic Information</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="tallyCardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tally Card Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., TC-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="itemNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Number *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warehouse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses.map((wh) => (
                          <SelectItem key={wh.value} value={wh.value}>
                            {wh.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-6" />

            {/* Section 4: Dates (inside form) */}
            <h2 className="mb-4 text-lg font-semibold">Dates</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="createdAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Created Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="updatedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Updated Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="snapshotAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Snapshot Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-6" />

            {/* Section 5: Additional Info */}
            <h2 className="mb-4 text-lg font-semibold">Additional Information</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-active"
                  checked={form.watch("isActive")}
                  onCheckedChange={(checked) => form.setValue("isActive", !!checked)}
                />
                <Label htmlFor="is-active">Active</Label>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.push("/forms/tally-cards")}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Form>
      </section>
    </div>
  );
}
