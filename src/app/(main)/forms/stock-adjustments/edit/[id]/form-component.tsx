// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/edit/[id]/form-component.tsx
// TYPE: Client Component
// PURPOSE: Form component for editing Stock Adjustments (user_tally_card_entries)
// -----------------------------------------------------------------------------

"use client";

import React, { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EditStockAdjustmentFormProps {
  id: string; // user_id (per current resource pk)
}

type Nullable<T> = T | null | undefined;

interface StockAdjustmentData {
  user_id: string;
  tally_card_number: string;
  card_uid: Nullable<string>;
  qty: Nullable<number>;
  location: Nullable<string>;
  note: Nullable<string>;
  updated_at: Nullable<string>;
}

export function EditStockAdjustmentForm({ id }: EditStockAdjustmentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<StockAdjustmentData>({
    user_id: "",
    tally_card_number: "",
    card_uid: null,
    qty: null,
    location: "",
    note: "",
    updated_at: "",
  });

  // Load existing data
  useEffect(() => {
    const loadEntry = async () => {
      try {
        const response = await fetch(`/api/tcm_user_tally_card_entries/${id}`);
        if (response.ok) {
          const payload = await response.json();
          const row = payload?.row ?? payload; // handle { row } shape
          setFormData({
            user_id: row?.user_id ?? id,
            tally_card_number: row?.tally_card_number ?? "",
            card_uid: row?.card_uid ?? null,
            qty: row?.qty ?? null,
            location: row?.location ?? "",
            note: row?.note ?? "",
            updated_at: row?.updated_at ?? "",
          });
        } else {
          alert("Failed to load Stock Adjustment data");
          router.push("/forms/stock-adjustments");
        }
      } catch (error) {
        console.error("Error loading stock adjustment:", error);
        alert("An error occurred while loading data");
        router.push("/forms/stock-adjustments");
      } finally {
        setLoading(false);
      }
    };

    loadEntry();
  }, [id, router]);

  const handleTextChange = (field: keyof StockAdjustmentData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleQtyChange = (value: string) => {
    const n = value.trim() === "" ? null : Number(value);
    setFormData((prev) => ({ ...prev, qty: Number.isFinite(n) ? n : null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/tcm_user_tally_card_entries/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        // Include user_id to satisfy fromInput() normalization in resource config
        body: JSON.stringify({
          user_id: id,
          tally_card_number: formData.tally_card_number || undefined,
          card_uid: formData.card_uid ?? null,
          qty: formData.qty == null ? null : Number(formData.qty),
          location: formData.location ?? null,
          note: formData.note ?? null,
        }),
      });

      if (response.ok) {
        alert("Stock Adjustment updated successfully!");
        router.push("/forms/stock-adjustments");
      } else {
        const errorData = await response.json();
        alert(`Failed to update Stock Adjustment: ${errorData.error?.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error updating stock adjustment:", error);
      alert("An error occurred while updating data");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-lg">Loading data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Stock Adjustment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Readonly / context */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>User ID (Readonly)</Label>
              <Input value={formData.user_id} disabled />
            </div>
            <div>
              <Label>Card UID (Readonly)</Label>
              <Input value={formData.card_uid ?? ""} disabled />
            </div>
            <div>
              <Label>Updated At (Readonly)</Label>
              <Input value={formData.updated_at ?? ""} disabled />
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tally_card_number">Tally Card Number *</Label>
              <Input
                id="tally_card_number"
                type="text"
                value={formData.tally_card_number}
                onChange={(e) => handleTextChange("tally_card_number", e.target.value)}
                required
                placeholder="Enter Tally Card number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                value={formData.qty == null ? "" : String(formData.qty)}
                onChange={(e) => handleQtyChange(e.target.value)}
                placeholder="e.g., 10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                type="text"
                value={formData.location ?? ""}
                onChange={(e) => handleTextChange("location", e.target.value)}
                placeholder="e.g., Aisle 2 Shelf B"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={formData.note ?? ""}
              onChange={(e) => handleTextChange("note", e.target.value)}
              placeholder="Enter note or adjustments details"
              rows={4}
            />
          </div>

          <div className="flex items-center justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/forms/stock-adjustments")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
