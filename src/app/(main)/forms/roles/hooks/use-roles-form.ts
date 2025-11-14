"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { toast } from "sonner";

import { supabaseBrowser } from "@/lib/supabase";

import type { Id, RoleInput } from "../_data/types";
import { createRole, updateRole, deleteRole, addRoleWarehouse, removeRoleWarehouses, addRoleFamilyPermission, removeRoleFamilyPermissions } from "../new/actions";

type Assigned = {
  warehouse: string;
  note: string | null;
  added_at: string;
  added_by: string | null;
};

const sb = supabaseBrowser();

export function useRolesForm(opts?: { initialRoleId?: string | null }) {
  // basic role state
  const [roleId, setRoleId] = useState<string | null>(opts?.initialRoleId ?? null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [roleFamily, setRoleFamily] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // warehouses data
  const [allWarehouses, setAllWarehouses] = useState<{ code: string; name: string }[]>([]);
  const [assigned, setAssigned] = useState<Assigned[]>([]);
  const [assignedQuery, setAssignedQuery] = useState("");
  const [selectedAssigned, setSelectedAssigned] = useState<Set<string>>(new Set());

  // permissions data
  const [allPermissions, setAllPermissions] = useState<{ key: string; description: string | null }[]>([]);
  const [assignedPermissions, setAssignedPermissions] = useState<{ key: string; description: string | null }[]>([]);
  const [permissionsQuery, setPermissionsQuery] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [selectedPermission, setSelectedPermission] = useState<string | null>(null);

  // add-warehouse form
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [addNote, setAddNote] = useState("");

  // ui flags
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, startMutate] = useTransition();

  const statusLabel = isActive ? "Active" : "Inactive";
  const assignedCount = assigned.length;

  const selectedWarehouseInfo = useMemo(
    () => allWarehouses.find((w) => w.code === selectedWarehouse) ?? null,
    [allWarehouses, selectedWarehouse],
  );

  const selectedPermissionInfo = useMemo(
    () => allPermissions.find((p) => p.key === selectedPermission) ?? null,
    [allPermissions, selectedPermission],
  );

  // Load source lists
  async function loadWarehouses() {
    const { data, error } = await sb.from("warehouses").select("code,name").order("code");
    if (error) throw error;
    setAllWarehouses((data ?? []).map((r: any) => ({ code: r.code, name: r.name ?? r.code })));
  }

  async function loadAssigned() {
    if (!roleId) {
      setAssigned([]);
      return;
    }
    // Fetch role-warehouse rules (only role_id and warehouse_id)
    const { data: rules, error: rulesErr } = await sb
      .from("role_warehouse_rules")
      .select("warehouse_id, note, added_at, added_by")
      .eq("role_id", roleId);
    
    if (rulesErr) throw rulesErr;
    
    if (!rules || rules.length === 0) {
      setAssigned([]);
      return;
    }
    
    // Get unique warehouse IDs
    const warehouseIds = [...new Set((rules ?? []).map((r: any) => r.warehouse_id).filter(Boolean))];
    
    // Fetch warehouses to get codes
    const { data: warehouses, error: warehousesErr } = await sb
      .from("warehouses")
      .select("id, code, name")
      .in("id", warehouseIds);
    
    if (warehousesErr) throw warehousesErr;
    
    // Build warehouse ID -> code map
    const warehouseCodeMap = new Map<string, string>();
    (warehouses ?? []).forEach((w: any) => {
      warehouseCodeMap.set(w.id, w.code);
    });
    
    // Transform to match Assigned type (warehouse is the code)
    setAssigned(
      (rules ?? []).map((r: any) => ({
        warehouse: warehouseCodeMap.get(r.warehouse_id) ?? "",
        note: r.note ?? null,
        added_at: r.added_at ?? "",
        added_by: r.added_by ?? null,
      })).filter((a: any) => a.warehouse) // Filter out any without a code
    );
  }

  async function loadRoleIfAny() {
    if (!roleId) return;
    const { data, error } = await sb
      .from("roles")
      .select("id,role_name,description,is_active,role_family,created_at,updated_at")
      .eq("id", roleId)
      .single();
    if (error) throw error;
    setName(data.role_name ?? "");
    setDescription(data.description ?? "");
    setIsActive(!!data.is_active);
    setRoleFamily(data.role_family ?? null);
    setCreatedAt(data.created_at ?? null);
    setUpdatedAt(data.updated_at ?? null);
  }

  async function loadPermissions() {
    const { data, error } = await sb.from("permissions").select("key,description").order("key");
    if (error) throw error;
    setAllPermissions(data ?? []);
  }

  async function loadAssignedPermissions() {
    if (!roleFamily) {
      setAssignedPermissions([]);
      return;
    }
    const { data, error } = await sb
      .from("permission_assignments")
      .select("permission_key, permissions:permissions!permission_assignments_permission_key_fkey(key, description)")
      .eq("role_family", roleFamily)
      .is("role_id", null)
      .is("user_id", null);
    if (error) throw error;
    setAssignedPermissions(
      (data ?? []).map((r: any) => ({
        key: r.permission_key,
        description: r.permissions?.description ?? null,
      }))
    );
  }

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadWarehouses(), loadAssigned(), loadRoleIfAny(), loadPermissions()])
      .catch((e) => toast.error(String(e?.message ?? e)))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  useEffect(() => {
    loadAssignedPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFamily]);

  // selection helpers
  function toggleAssigned(warehouse: string) {
    setSelectedAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(warehouse)) next.delete(warehouse);
      else next.add(warehouse);
      return next;
    });
  }
  function clearSelection() {
    setSelectedAssigned(new Set());
  }

  // mutations
  async function onSave() {
    startMutate(async () => {
      try {
        const payload: RoleInput = { name, description, is_active: isActive, role_family: roleFamily };
        if (!roleId) {
          const id = await createRole(payload);
          setRoleId(id as any);
          toast.success("Role created");
        } else {
          await updateRole(roleId, payload);
          toast.success("Role updated");
        }
        await loadAssigned();
        await loadAssignedPermissions();
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to save role");
      }
    });
  }

  async function onCancel() {
    setName("");
    setDescription("");
    setIsActive(true);
    setSelectedWarehouse(null);
    setAddNote("");
    clearSelection();
  }

  async function addWarehouse() {
    if (!roleId || !selectedWarehouse) return;
    startMutate(async () => {
      try {
        await addRoleWarehouse(roleId, selectedWarehouse, addNote || null);
        setAddNote("");
        setSelectedWarehouse(null);
        await loadAssigned();
        toast.success("Warehouse assigned");
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to add warehouse");
      }
    });
  }

  async function removeSelected() {
    if (!roleId || !selectedAssigned.size) return;
    const list = Array.from(selectedAssigned);
    startMutate(async () => {
      try {
        await removeRoleWarehouses(roleId, list);
        clearSelection();
        await loadAssigned();
        toast.success("Removed selected");
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to remove");
      }
    });
  }

  function togglePermission(key: string) {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function clearPermissionSelection() {
    setSelectedPermissions(new Set());
  }

  async function addPermission() {
    if (!roleFamily || !selectedPermission) return;
    startMutate(async () => {
      try {
        await addRoleFamilyPermission(roleFamily, selectedPermission);
        setSelectedPermission(null);
        await loadAssignedPermissions();
        toast.success("Permission assigned");
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to add permission");
      }
    });
  }

  async function removeSelectedPermissions() {
    if (!roleFamily || !selectedPermissions.size) return;
    const list = Array.from(selectedPermissions);
    startMutate(async () => {
      try {
        await removeRoleFamilyPermissions(roleFamily, list);
        clearPermissionSelection();
        await loadAssignedPermissions();
        toast.success("Removed selected permissions");
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to remove");
      }
    });
  }

  return {
    // role fields
    roleId,
    name,
    description,
    isActive,
    roleFamily,
    createdAt,
    updatedAt,
    setName,
    setDescription,
    setIsActive,
    setRoleFamily,

    // computed
    statusLabel,
    assignedCount,

    // add warehouse
    allWarehouses,
    selectedWarehouse,
    setSelectedWarehouse,
    addNote,
    setAddNote,
    selectedWarehouseInfo,
    addWarehouse,

    // assigned list
    assigned,
    assignedQuery,
    setAssignedQuery,
    selectedAssigned,
    toggleAssigned,
    clearSelection,
    removeSelected,

    // permissions
    allPermissions,
    assignedPermissions,
    permissionsQuery,
    setPermissionsQuery,
    selectedPermission,
    setSelectedPermission,
    selectedPermissionInfo,
    selectedPermissions,
    togglePermission,
    clearPermissionSelection,
    addPermission,
    removeSelectedPermissions,

    // ui
    isLoading,
    isMutating,

    // global actions
    onSave,
    onCancel,
  };
}
