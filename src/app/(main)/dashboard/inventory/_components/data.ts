// src/app/(main)/dashboard/inventory/_components/data.ts

import { supabase } from '@/lib/supabase'

export type Inventory = {
  [key: string]: any
  item_number: number
  type: string
  description: string
  total_available: number | null
  total_checked_out: number | null
  total_in_house: number | null
  on_order: number | null
  committed: number | null
  tax_code: string | null
  item_cost: string
  cost_method: string
  item_list_price: string
  item_sale_price: string
  lot: string | null
  date_code: string | null
  manufacturer: string | null
  category: string | null
  stocking_unit: string | null
  alt_item_number: string | null
  serial_number: string | null
  checkout_length: number | null
  attachment: boolean | null
  location: string | null
  warehouse: string | null
  height: string
  width: string
  depth: string
  weight: string
  max_volume: string
  event_type: string | null
  is_deleted: boolean
}

export async function getInventory(): Promise<Inventory[]> {
  const PAGE_SIZE = 1000
  let from = 0
  const allRecords: Inventory[] = []

  while (true) {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error('Error fetching inventory batch:', { from, error })
      break
    }

    if (!data) {
      console.warn('No data returned for inventory batch at offset', from)
      break
    }

    console.log(`Fetched ${data.length} rows from inventory (offset ${from})`)
    allRecords.push(...data)

    // if fewer than a full page, we’re done
    if (data.length < PAGE_SIZE) {
      break
    }

    from += PAGE_SIZE
  }

  // Normalize defaults
  return allRecords.map((r) => ({
    ...r,
    item_number: r.item_number ?? 0,
    type: r.type ?? '',
    description: r.description ?? '',
    total_available: r.total_available ?? 0,
    total_checked_out: r.total_checked_out ?? 0,
    total_in_house: r.total_in_house ?? 0,
    on_order: r.on_order ?? 0,
    committed: r.committed ?? 0,
    tax_code: r.tax_code ?? '',
    item_cost: r.item_cost ?? '',
    cost_method: r.cost_method ?? '',
    item_list_price: r.item_list_price ?? '',
    item_sale_price: r.item_sale_price ?? '',
    lot: r.lot ?? '',
    date_code: r.date_code ?? '',
    manufacturer: r.manufacturer ?? '',
    category: r.category ?? '',
    stocking_unit: r.stocking_unit ?? '',
    alt_item_number: r.alt_item_number ?? '',
    serial_number: r.serial_number ?? '',
    checkout_length: r.checkout_length ?? null,
    attachment: r.attachment ?? false,
    location: r.location ?? '',
    warehouse: r.warehouse ?? '',
    height: r.height ?? '',
    width: r.width ?? '',
    depth: r.depth ?? '',
    weight: r.weight ?? '',
    max_volume: r.max_volume ?? '',
    event_type: r.event_type ?? '',
    is_deleted: r.is_deleted ?? false,
  }))
}
