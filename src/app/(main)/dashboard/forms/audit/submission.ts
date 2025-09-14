// src/app/(main)/dashboard/forms/audit/submission.ts

import { supabase } from "@/lib/supabase";
import { tableName, auditFormConfig, FieldConfig } from "./config";

export type SubmitResult = {
  data: any | null;
  error: { code: string; message: string } | null;
};

// Cache last payload JSON to prevent immediate duplicate submissions
let lastPayloadJson: string | null = null;

/**
 * Build payload entirely from config:
 * - Dates → ISO strings
 * - Multiselect arrays → comma-separated text
 */
function buildPayload(formData: Record<string, any>): Record<string, any> {
  return auditFormConfig.reduce((payload, field) => {
    let value = formData[field.name];

    if (field.type === "date" && value instanceof Date) {
      value = value.toISOString();
    }

    if (field.type === "multiselect" && Array.isArray(value)) {
      value = value.join(", ");
    }

    payload[field.name] = value;
    return payload;
  }, {} as Record<string, any>);
}

/**
 * Submit the form to Supabase using the tableName from config.
 * Features:
 * - double-submit prevention
 * - detailed try/catch logging
 * - friendly unique-constraint handling
 * - returns the inserted row (with id, submission_date, etc.)
 */
export async function submitAuditForm(
  formData: Record<string, any>
): Promise<SubmitResult> {
  const payload = buildPayload(formData);
  const payloadJson = JSON.stringify(payload);

  // Prevent identical back-to-back submissions
  if (lastPayloadJson === payloadJson) {
    console.error("🚫 Duplicate submission blocked", payload);
    return {
      data: null,
      error: {
        code: "DUPLICATE_SUBMISSION",
        message: "You have already submitted these exact values.",
      },
    };
  }
  lastPayloadJson = payloadJson;

  try {
    // Insert and then select the full row back (JS client v2)
    const { data, error } = await supabase
      .from(tableName)
      .insert([payload])
      .select()    // ask Supabase to return all columns
      .single();   // expect one row back

    if (error) {
      // Handle unique-constraint violations
      if (error.code === "23505") {
        console.error("❌ Unique violation:", error);
        return {
          data: null,
          error: {
            code: "DUPLICATE_RECORD",
            message: "A record with those values already exists.",
          },
        };
      }
      // Other Supabase errors
      console.error("❌ Supabase insert error:", error);
      return {
        data: null,
        error: {
          code: error.code ?? "INSERT_ERROR",
          message: error.message,
        },
      };
    }

    console.log("🎉 Insert succeeded:", data);
    return { data, error: null };
  } catch (err: any) {
    // Catch unexpected runtime errors
    console.error("🚨 Unexpected submission error:", err);
    return {
      data: null,
      error: {
        code: err.code ?? "UNKNOWN_ERROR",
        message: err.message ?? String(err),
      },
    };
  }
}
