import { supabaseServer } from "@/lib/supabase-server";

export type Requisition = {
  [key: string]: any;
  requisition_order_number: string;
  order_date: string | null;
  due_date: string | null;
  status: string;
  warehouse: string | null;
  created_by: string | null;
  project_number: string | null;
  customer_name: string | null;
};

export async function getRequisitions(
  _range: string, // retained for signature consistency
  _from?: string,
  _to?: string,
): Promise<Requisition[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("requisitions").select("*"); // ✅ No filtering — always get full dataset

  if (error ?? !data) return [];

  return (data as Array<Record<string, unknown>>).map((r: Record<string, unknown>) => ({
    ...r,
    requisition_order_number: String(r.requisition_order_number ?? ""),
    order_date: (r.order_date as string | null) ?? "",
    due_date: (r.due_date as string | null) ?? "",
    status: String(r.status ?? ""),
    warehouse: (r.warehouse as string | null) ?? "",
    created_by: (r.created_by as string | null) ?? "",
    project_number: (r.project_number as string | null) ?? "",
    customer_name: (r.customer_name as string | null) ?? "N/A",
  }));
}
