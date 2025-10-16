"use client";
// cspell:words hashdiff cardUID

import React, { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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

import { formSchema, defaultValues, fetchWarehouses } from "./config";

// Define status options
const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

export function NewTallyCardForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Array<{ value: string; label: string }>>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Mock readonly fields
  const [cardUID] = useState("auto-generated-uuid");
  const [hashdiff] = useState("auto-hash");

  // Load warehouses on component mount
  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const warehouseData = await fetchWarehouses();
        setWarehouses(warehouseData);
      } catch (error) {
        console.error("Failed to load warehouses:", error);
        // Use fallback data
        setWarehouses([
          { value: "BP - WH 1", label: "BP - WH 1" },
          { value: "BP - WH 2", label: "BP - WH 2" },
          { value: "BDI - WH 1", label: "BDI - WH 1" },
          { value: "AMC - WH 2", label: "AMC - WH 2" },
          { value: "RTZ - WH 1", label: "RTZ - WH 1" },
          { value: "CC - WH 1", label: "CC - WH 1" },
        ]);
      }
    };

    loadWarehouses();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      // Prefer warehouseId; fallback to warehouse when not provided
      const warehouseValue = ((values as any).warehouseId || (values as any).warehouse) as string;
      const selectedWh = warehouses.find((w) => w.value === warehouseValue);

      // Transform form data to match the API structure
      const payload = {
        card_uid: values.cardUid,
        warehouse: selectedWh?.label ?? (values as any).warehouse ?? "",
        item_number: values.itemNumber, // textual; API will normalize digits
        quantity: values.quantity,
        status: values.status,
        owner: values.owner,
        notes: values.notes || "",
      };

      const response = await fetch("/api/tally_cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to save tally card");
      }

      const result = await response.json();
      toast.success("Tally card saved successfully!");
      router.push("/forms/tally-cards");
    } catch (error) {
      console.error("Error saving tally card:", error);
      toast.error(`Failed to save tally card: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl bg-white shadow-md dark:bg-gray-800 dark:shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
          {/* Readonly Details */}
          <h2 className="mb-4 text-lg font-semibold">Details</h2>
          <div className="grid gap-4 md:grid-cols-3">
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
          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="cardUid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card UID *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., TC-2025-001235" {...field} />
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
                    <Input placeholder="e.g., ITEM-000456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="warehouseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warehouse *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="w-full">
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

          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 100"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="w-full">
                      {statusOptions.map((status: { value: string; label: string }) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="owner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., ahmed" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator className="my-6" />

          {/* Additional Information */}
          <h2 className="mb-4 text-lg font-semibold">Additional Information</h2>
          <div className="grid gap-4 md:grid-cols-1">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter any additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Buttons */}
          <div className="mt-6 flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/forms/tally-cards")}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
