"use client";
// cspell:words adjustmentId

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

import {
  formSchema,
  defaultValues,
  fetchWarehouses,
  adjustmentTypeOptions,
  statusOptions,
  reasonOptions,
} from "./form.config";

export function NewStockAdjustmentForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Array<{ value: string; label: string }>>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Mock readonly fields
  const [adjustmentUID] = useState("auto-generated-uuid");
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
      const warehouseValue = values.warehouseId;
      const selectedWh = warehouses.find((w) => w.value === warehouseValue);

      // Calculate adjustment difference
      const adjustmentDifference = (values.adjustedQuantity || 0) - (values.currentQuantity || 0);

      // Transform form data to match the API structure
      const payload = {
        adjustment_id: values.adjustmentId,
        warehouse: selectedWh?.label ?? "",
        item_number: values.itemNumber,
        current_quantity: values.currentQuantity,
        adjusted_quantity: values.adjustedQuantity,
        adjustment_difference: adjustmentDifference,
        adjustment_type: values.adjustmentType,
        reason: values.reason,
        notes: values.notes || "",
        status: values.status,
        owner: values.owner,
      };

      const response = await fetch("/api/stock-adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create stock adjustment");
      }

      const result = await response.json();
      toast.success("Stock adjustment created successfully!");
      router.push("/forms/stock-adjustments");
    } catch (error) {
      console.error("Error creating stock adjustment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create stock adjustment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl bg-white shadow-md dark:bg-gray-800 dark:shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
          <h2 className="mb-4 text-lg font-semibold">Details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Adjustment UID (Readonly)</Label>
              <Input value={adjustmentUID} disabled />
            </div>
            <div>
              <Label>Hash Diff (Readonly)</Label>
              <Input value={hashdiff} disabled />
            </div>
          </div>

          <Separator className="my-6" />

          <h2 className="mb-4 text-lg font-semibold">Basic Information</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="adjustmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment ID *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., ADJ-001" {...field} />
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
                    <Input placeholder="e.g., 12345" {...field} />
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
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.value} value={warehouse.value}>
                          {warehouse.label}
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
                    <Input placeholder="e.g., John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator className="my-6" />

          <h2 className="mb-4 text-lg font-semibold">Quantity Information</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="currentQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Quantity *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="adjustedQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjusted Quantity *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="adjustmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Select adjustment type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {adjustmentTypeOptions.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reasonOptions.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
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

          <h2 className="mb-4 text-lg font-semibold">Status & Notes</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((status) => (
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
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Additional notes about this stock adjustment..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator className="my-6" />

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/forms/stock-adjustments")}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Stock Adjustment"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
