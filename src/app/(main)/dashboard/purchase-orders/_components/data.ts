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

  return (data as Array<Record<string, unknown>>).map((po: Record<string, unknown>) => ({
    po_number: String(po.po_number ?? ""),
    order_date: (po.order_date as string | null) ?? null,
    due_date: (po.due_date as string | null) ?? null,
    status: String(po.status ?? ""),
    warehouse: String(po.warehouse ?? ""),
    vendor_name: String(po.vendor_name ?? "N/A"),
    vendor_number: Number(po.vendor_number ?? 0),
    grand_total: String(po.grand_total ?? "0"),
    is_deleted: Boolean(po.is_deleted ?? false),
  }));
}
