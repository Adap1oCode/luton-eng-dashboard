// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/tally-cards/edit/[id]/form-component.tsx
// TYPE: Client Component
// PURPOSE: Form component for editing Tally Cards
// -----------------------------------------------------------------------------

"use client";

import React, { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface EditTallyCardFormProps {
  id: string;
}

interface TallyCardData {
  id: string;
  tally_card_number: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function EditTallyCardForm({ id }: EditTallyCardFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<TallyCardData>({
    id: "",
    tally_card_number: "",
    description: "",
    status: "active",
    created_at: "",
    updated_at: "",
  });

  // Load existing data
  useEffect(() => {
    const loadTallyCard = async () => {
      try {
        const response = await fetch(`/api/tally_cards/${id}`);
        if (response.ok) {
          const data = await response.json();
          setFormData(data);
        } else {
          alert("Failed to load Tally Card data");
          router.push("/forms/tally-cards");
        }
      } catch (error) {
        console.error("Error loading tally card:", error);
        alert("An error occurred while loading data");
        router.push("/forms/tally-cards");
      } finally {
        setLoading(false);
      }
    };

    loadTallyCard();
  }, [id, router]);

  const handleInputChange = (field: keyof TallyCardData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/tally_cards/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tally_card_number: formData.tally_card_number,
          description: formData.description,
          status: formData.status,
        }),
      });

      if (response.ok) {
        alert("Tally Card updated successfully!");
        router.push("/forms/tally-cards");
      } else {
        const errorData = await response.json();
        alert(`Failed to update Tally Card: ${errorData.error?.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error updating tally card:", error);
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
        <CardTitle>Edit Tally Card Data</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tally_card_number">Tally Card Number *</Label>
              <Input
                id="tally_card_number"
                type="text"
                value={formData.tally_card_number}
                onChange={(e) => handleInputChange("tally_card_number", e.target.value)}
                required
                placeholder="Enter Tally Card number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Enter Tally Card description"
              rows={4}
            />
          </div>

          <div className="flex items-center justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => router.push("/forms/tally-cards")} disabled={saving}>
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
