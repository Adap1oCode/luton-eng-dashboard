import React from "react";

import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateRoleDialogProps {
  open: boolean;
  roleName: string;
  roleCode: string;
  warehousesText: string;
  isActive: boolean;
  onOpenChange: (open: boolean) => void;
  onRoleNameChange: (value: string) => void;
  onRoleCodeChange: (value: string) => void;
  onWarehousesChange: (value: string) => void;
  onIsActiveChange: (value: boolean) => void;
  onSave: () => void;
}

export const CreateRoleDialog: React.FC<CreateRoleDialogProps> = ({
  open,
  roleName,
  roleCode,
  warehousesText,
  isActive,
  onOpenChange,
  onRoleNameChange,
  onRoleCodeChange,
  onWarehousesChange,
  onIsActiveChange,
  onSave,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>Enter role details and it will be added to the table.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="new-role-name">Role Name *</Label>
            <Input
              id="new-role-name"
              placeholder="e.g., Store Officer"
              value={roleName}
              onChange={(e) => onRoleNameChange(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-role-code">Role Code *</Label>
            <Input
              id="new-role-code"
              placeholder="e.g., SO_RTZ"
              value={roleCode}
              onChange={(e) => onRoleCodeChange(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-role-warehouses">Warehouses (comma-separated)</Label>
            <Input
              id="new-role-warehouses"
              placeholder="RTZ, BDI, CCW"
              value={warehousesText}
              onChange={(e) => onWarehousesChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="new-role-active" checked={isActive} onCheckedChange={(v) => onIsActiveChange(!!v)} />
            <Label htmlFor="new-role-active">Active</Label>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!roleName.trim() || !roleCode.trim()}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
