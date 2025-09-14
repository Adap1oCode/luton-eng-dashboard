// src/app/(main)/dashboard/forms/audit/field-renderer.tsx
"use client";

import { format } from "date-fns";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

export default function FormFieldRenderer({
  fieldConfig,
  form,
}: {
  fieldConfig: any;
  form: any;
}) {
  return (
    <FormField
      control={form.control}
      name={fieldConfig.name as any}
      render={({ field }) => (
        <FormItem className="flex flex-1 flex-col gap-2">
          <FormLabel className="flex items-center gap-1">
            {fieldConfig.label}
            {fieldConfig.required && <span className="text-red-500">*</span>}
            {fieldConfig.helperText && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-sm">{fieldConfig.helperText}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </FormLabel>
          <FormControl>
            {fieldConfig.type === "textarea" ? (
              <Textarea
                className="w-full"
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            ) : fieldConfig.type === "select" ? (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={`Select ${fieldConfig.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {fieldConfig.options?.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : fieldConfig.type === "multiselect" ? (
              <div className="flex flex-wrap gap-3 pt-1">
                {fieldConfig.options?.map((option: string) => (
                  <label key={option} className="flex items-center space-x-2">
                    <Checkbox
                      value={option}
                      checked={field.value?.includes(option)}
                      onCheckedChange={(checked) => {
                        const updated = checked
                          ? [...(field.value || []), option]
                          : field.value.filter((v: string) => v !== option);
                        field.onChange(updated);
                      }}
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            ) : fieldConfig.type === "date" ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Input
                    className="w-full"
                    value={
                      field.value
                        ? format(new Date(field.value), "dd/MM/yyyy")
                        : ""
                    }
                    onChange={() => {}}
                    placeholder="dd/mm/yyyy"
                    readOnly
                  />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <Input
                className="w-full"
                type={fieldConfig.type === "number" ? "number" : "text"}
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
