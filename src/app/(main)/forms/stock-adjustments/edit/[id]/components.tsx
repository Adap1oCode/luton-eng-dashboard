// -----------------------------------------------------------------------------
// FILE: src/app/(main)/forms/stock-adjustments/edit/[id]/components.tsx
// TYPE: Client Component
// PURPOSE: Header and toolbar components for Edit Stock Adjustment page
// -----------------------------------------------------------------------------

"use client";

import React from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface EditStockAdjustmentPageHeaderProps {
  id: string;
}

export function EditStockAdjustmentPageHeader({ id }: EditStockAdjustmentPageHeaderProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <CardTitle className="text-2xl font-bold">Edit Stock Adjustment</CardTitle>
            <CardDescription>Edit Entry #{id}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

interface EditStockAdjustmentToolbarProps {
  id: string;
}

export function EditStockAdjustmentToolbar({ id }: EditStockAdjustmentToolbarProps) {
  const router = useRouter();

  const handleSave = () => {
    // Saving is handled inside the form; this is a visual affordance
    console.log("Save triggered from toolbar");
  };

  const handleCancel = () => {
    router.push("/forms/stock-adjustments");
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button type="button" variant="default" onClick={handleSave} className="flex items-center space-x-2">
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} className="flex items-center space-x-2">
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
