"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { toast } from "sonner";

import { supabaseBrowser } from "@/lib/supabase";

import type { Id, RoleInput } from "../_data/types";
import { createRole, updateRole, deleteRole, addRoleWarehouse, removeRoleWarehouses } from "../new/actions";

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
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // warehouses data
  const [allWarehouses, setAllWarehouses] = useState<{ code: string; name: string }[]>([]);
  const [assigned, setAssigned] = useState<Assigned[]>([]);
  const [assignedQuery, setAssignedQuery] = useState("");
  const [selectedAssigned, setSelectedAssigned] = useState<Set<string>>(new Set());

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
    const { data, error } = await sb
      .from("role_warehouse_rules")
      .select("warehouse, note, added_at, added_by")
      .eq("role_id", roleId)
      .order("warehouse");
    if (error) throw error;
    setAssigned(data ?? []);
  }

  async function loadRoleIfAny() {
    if (!roleId) return;
    const { data, error } = await sb
      .from("roles")
      .select("id,name,description,is_active,created_at,updated_at")
      .eq("id", roleId)
      .single();
    if (error) throw error;
    setName(data.name ?? "");
    setDescription(data.description ?? "");
    setIsActive(!!data.is_active);
    setCreatedAt(data.created_at ?? null);
    setUpdatedAt(data.updated_at ?? null);
  }

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadWarehouses(), loadAssigned(), loadRoleIfAny()])
      .catch((e) => toast.error(String(e?.message ?? e)))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

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
        const payload: RoleInput = { name, description, is_active: isActive };
        if (!roleId) {
          const id = await createRole(payload);
          setRoleId(id as any);
          toast.success("Role created");
        } else {
          await updateRole(roleId, payload);
          toast.success("Role updated");
        }
        await loadAssigned();
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

  return {
    // role fields
    roleId,
    name,
    description,
    isActive,
    createdAt,
    updatedAt,
    setName,
    setDescription,
    setIsActive,

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

    // ui
    isLoading,
    isMutating,

    // global actions
    onSave,
    onCancel,
  };
}
