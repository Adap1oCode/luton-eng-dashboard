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

import { formSchema, defaultValues, warehouses } from "./config";

export default function NewTallyCardPage() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Mock warehouses list imported from config.tsx

  // Mock readonly fields
  const [cardUID] = useState("auto-generated-uuid");
  const [hashdiff] = useState("auto-hash");

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    console.log("Saving tally card:", values);
    router.push("/forms/tally-cards");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        {/* Page Header */}
        <NewTallyCardPageHeader />
        {/* Toolbar */}
        <NewTallyCardToolbar />
        {/* Main Form */}
        <div className="rounded-xl bg-white shadow-md dark:bg-gray-800 dark:shadow-lg">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
              {/* Readonly Details */}
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

              <Separator className="my-6" />

              {/* Basic Information */}
              <h2 className="mb-4 text-lg font-semibold">Basic Information</h2>
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

              {/* Dates */}
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

              {/* Additional Information */}
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
        </div>
      </div>
    </div>
  );
}

// Custom Page Header for New Tally Card
function NewTallyCardPageHeader() {
  return (
    <div className="rounded-xl bg-white p-8 shadow-md dark:bg-gray-800">
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0">
          <svg className="h-14 w-14 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H11V21H5V3H13V9H21ZM14 10V12H16V10H14ZM16 14H14V16H16V14ZM20.5 18.5L19.09 17.09L15.5 20.68L13.91 19.09L12.5 20.5L15.5 23.5L20.5 18.5Z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Tally Card</h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Add a new tally card with detailed information
          </p>
        </div>
      </div>
    </div>
  );
}

// Custom Toolbar for New Tally Card
function NewTallyCardToolbar() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-md dark:bg-gray-800">
      <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-md bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
            New Tally Card Form
          </div>
          <div className="rounded-md bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            Ready to Save
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-base text-gray-600 dark:text-gray-400">
            Fill in the required fields to create the tally card
          </div>
        </div>
      </div>
    </div>
  );
}
