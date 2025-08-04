"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Form } from "@/components/ui/form";
import {
  auditFormConfig,
  formTitle,
  formDescription,
} from "./config";
import { buildSchema } from "./build-schema";
import { buildDefaultValues } from "./build-defaults";
import FieldRenderer from "./field-renderer";
import { submitAuditForm } from "./submission";
import type { AuditRow } from "./submissions-table";

const schema = buildSchema(auditFormConfig);
const blankDefaults = buildDefaultValues(auditFormConfig);

interface DynamicFormProps {
  initialData?: AuditRow;
}

export default function DynamicForm({ initialData }: DynamicFormProps) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: blankDefaults,
  });
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  // whenever initialData changes, reset the form
  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  const onSubmit = async (data: any) => {
    setStatus("submitting");
    const { error } = await submitAuditForm(data);
    if (error) {
      setStatus("error");
    } else {
      setStatus("success");
      form.reset(blankDefaults);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col">
    <div className="bg-white rounded-xl border shadow-md overflow-hidden h-full flex flex-col">
        {/* Header */}
      <div className="px-6 py-8 border-b">
        <h1 className="text-2xl font-semibold">{formTitle}</h1>
        <p className="text-muted-foreground mt-1">{formDescription}</p>
      </div>

        {/* Body */}
        <div className="p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col space-y-6 items-start"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
                {auditFormConfig.map((field) => (
                  <FieldRenderer
                    key={field.name}
                    fieldConfig={field}
                    form={form}
                  />
                ))}
              </div>

              <div className="mt-6 flex justify-start items-center w-full">
                {status === "success" && (
                  <p className="text-sm text-green-600 mr-4">
                    ✔ Submitted successfully
                  </p>
                )}
                {status === "error" && (
                  <p className="text-sm text-red-600 mr-4">
                    ❌ Submission failed. Check console for details.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 rounded-md text-sm font-medium"
                >
                  {status === "submitting" ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
