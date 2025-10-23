import { supabaseServer } from "@/lib/supabase-server";

export type PurchaseOrder = {
  po_number: string;
  order_date: string | null;
  due_date: string | null;
  status: string;
  warehouse: string;
  vendor_name: string;
  vendor_number: number;
  grand_total: string;
  is_deleted: boolean;
};

export async function getPurchaseOrders(
  _range: string, // retained for signature consistency
  _from?: string,
  _to?: string,
): Promise<PurchaseOrder[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("purchaseorders").select("*");

  if (error ?? !data) return [];

  return data.map((po) => ({
    po_number: po.po_number ?? "",
    order_date: po.order_date ?? null,
    due_date: po.due_date ?? null,
    status: po.status ?? "",
    warehouse: po.warehouse ?? "",
    vendor_name: po.vendor_name ?? "N/A",
    vendor_number: po.vendor_number ?? 0,
    grand_total: po.grand_total ?? "0",
    is_deleted: po.is_deleted ?? false,
  }));
}
