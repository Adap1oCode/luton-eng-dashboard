"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/supabase";
import type { Assigned, Warehouse } from "../_data/types";

export function useRolesForm({ initialRoleId }: { initialRoleId: string | null }) {
  const router = useRouter();
  const supabase = supabaseBrowser();

  // identity
  const [roleId, setRoleId] = React.useState<string | null>(initialRoleId);
  const [roleCode, setRoleCode] = React.useState<string>("");
  const [originalRoleCode, setOriginalRoleCode] = React.useState<string>("");

  // details (roles table has: role_code, role_name, description?, is_active; no timestamps)
  const [name, setName] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [isActive, setIsActive] = React.useState<boolean>(true);
  const [createdAt] = React.useState<string | null>(null);
  const [updatedAt] = React.useState<string | null>(null);

  // source warehouses + picker
  const [allWarehouses, setAllWarehouses] = React.useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = React.useState<string | null>(null);
  const [addNote, setAddNote] = React.useState<string>(""); // UI only for now (no column)

  // assigned (table needs added_at/added_by/note -> provide nulls)
  const [assigned, setAssigned] = React.useState<Assigned[]>([]);
  const assignedCount = assigned.length;

  // table search/selection
  const [assignedQuery, setAssignedQuery] = React.useState<string>("");
  const [selectedAssigned, setSelectedAssigned] = React.useState<Set<string>>(new Set());

  // flags
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMutating, setIsMutating] = React.useState(false);
  const [isAdding, setIsAdding] = React.useState(false);

  // fast code->warehouse lookup
  const codeToWarehouse = React.useMemo(() => {
    const m = new Map<string, Warehouse>();
    for (const w of allWarehouses) m.set(w.code, w);
    return m;
  }, [allWarehouses]);

  const selectedWarehouseInfo = React.useMemo(
    () => (selectedWarehouse ? codeToWarehouse.get(selectedWarehouse) ?? null : null),
    [codeToWarehouse, selectedWarehouse],
  );

  // load warehouses once
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("code, name")
        .order("code", { ascending: true });

      if (error) {
        toast.error(error.message || "Failed to load warehouses");
        if (mounted) setAllWarehouses([]);
        return;
      }
      if (mounted) {
        setAllWarehouses((data ?? []).map((w: any) => ({ code: String(w.code), name: String(w.name ?? w.code) })));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // load role & its assignments when editing
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        if (!initialRoleId) {
          // new role defaults
          setRoleId(null);
          setRoleCode("");
          setOriginalRoleCode("");
          setName("");
          setDescription("");
          setIsActive(true);
          setAssigned([]);
          setSelectedAssigned(new Set());
          return;
        }

        const { data: role, error: roleErr } = await supabase
          .from("roles")
          .select("id, role_code, role_name, description, is_active")
          .eq("id", initialRoleId)
          .single();

        if (roleErr) throw roleErr;
        if (!role) throw new Error("Role not found");

        const { data: rules, error: rulesErr } = await supabase
          .from("role_warehouse_rules")
          .select("warehouse")
          .eq("role_code", role.role_code);

        if (rulesErr) throw rulesErr;

        const rows: Assigned[] =
          (rules ?? [])
            .map((r: any) => {
              const code = String(r.warehouse ?? "").trim();
              if (!code) return null;
              const w = codeToWarehouse.get(code);
              return {
                warehouse: code,
                name: w?.name ?? code,
                added_at: null, // no column
                added_by: null, // no column
                note: null,     // no column
              } as Assigned;
            })
            .filter(Boolean)
            .sort((a, b) => a!.warehouse.localeCompare(b!.warehouse)) as Assigned[];

        if (!mounted) return;

        setRoleId(role.id);
        setRoleCode(String(role.role_code ?? ""));
        setOriginalRoleCode(String(role.role_code ?? ""));
        setName(String(role.role_name ?? ""));
        setDescription(String(role.description ?? ""));
        setIsActive(!!role.is_active);
        setAssigned(rows);
        setSelectedAssigned(new Set());
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load role");
      } finally {
        setIsLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRoleId, supabase, codeToWarehouse]);

  // add assignment
  const addWarehouse = async (): Promise<void> => {
    if (!roleId) return void toast.error("Save the role first before adding warehouses.");
    if (!roleCode?.trim()) return void toast.error("Role code is required.");
    if (!selectedWarehouse) return void toast.error("Please select a warehouse.");
    if (assigned.some((a) => a.warehouse === selectedWarehouse)) return void toast.error("Warehouse already assigned.");

    setIsAdding(true);
    const { error } = await supabase
      .from("role_warehouse_rules")
      .insert({ role_code: roleCode.trim(), warehouse: selectedWarehouse /*, role_id: roleId*/ });
    setIsAdding(false);

    if (error) return void toast.error(error.message || "Failed to add warehouse");

    const w = codeToWarehouse.get(selectedWarehouse);
    setAssigned((prev) =>
      [...prev, { warehouse: selectedWarehouse, name: w?.name ?? selectedWarehouse, added_at: null, added_by: null, note: null }]
        .sort((a, b) => a.warehouse.localeCompare(b.warehouse)),
    );

    setSelectedWarehouse(null);
    setAddNote(""); // UI-only
    toast.success("Warehouse added");
  };

  // selection model
  const toggleAssigned = (warehouseCode: string) => {
    setSelectedAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(warehouseCode)) next.delete(warehouseCode);
      else next.add(warehouseCode);
      return next;
    });
  };
  const clearSelection = () => setSelectedAssigned(new Set());

  // remove selected
  const removeSelected = async (): Promise<void> => {
    const codes = Array.from(selectedAssigned);
    if (!codes.length) return;
    if (!roleCode) return void toast.error("Role code is required.");

    setIsMutating(true);
    const { error } = await supabase
      .from("role_warehouse_rules")
      .delete()
      .eq("role_code", roleCode)
      .in("warehouse", codes);
    setIsMutating(false);

    if (error) return void toast.error(error.message || "Failed to remove selected");

    setAssigned((prev) => prev.filter((a) => !codes.includes(a.warehouse)));
    setSelectedAssigned(new Set());
    toast.success("Removed");
  };

  // save (create / update + migrate rules when role_code changes)
  const onSave = async (): Promise<void> => {
    if (!roleCode?.trim()) return void toast.error("Role code is required.");
    if (!name?.trim()) return void toast.error("Role name is required.");

    setIsMutating(true);
    try {
      if (!roleId) {
        const { data, error } = await supabase
          .from("roles")
          .insert({
            role_code: roleCode.trim(),
            role_name: name.trim(),
            description: description || null,
            is_active: isActive,
            can_manage_roles: false,
            can_manage_cards: false,
            can_manage_entries: false,
          })
          .select("id, role_code")
          .single();

        if (error) throw error;
        setRoleId(data.id);
        setOriginalRoleCode(data.role_code);
        toast.success(`Role "${data.role_code}" created`);
      } else {
        const codeChanged = !!originalRoleCode && originalRoleCode !== roleCode;

        const { error: updErr } = await supabase
          .from("roles")
          .update({
            role_code: roleCode.trim(),
            role_name: name.trim(),
            description: description || null,
            is_active: isActive,
          })
          .eq("id", roleId);

        if (updErr) throw updErr;

        if (codeChanged) {
          const { error: delErr } = await supabase.from("role_warehouse_rules").delete().eq("role_code", originalRoleCode);
          if (delErr) {
            toast.error("Role updated, but failed to migrate warehouse rules (delete).");
          } else if (assigned.length) {
            const payload = assigned.map((a) => ({ role_code: roleCode.trim(), warehouse: a.warehouse /*, role_id: roleId*/ }));
            const { error: insErr } = await supabase.from("role_warehouse_rules").insert(payload);
            if (insErr) toast.error("Role updated, but failed to migrate warehouse rules (insert).");
          }
          setOriginalRoleCode(roleCode);
        }

        toast.success(`Role "${roleCode}" updated`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save role");
    } finally {
      setIsMutating(false);
    }
  };

  const onCancel = () => router.push("/forms/roles");

  return {
    // RoleDetailsSection
    roleId,
    name,
    description,
    isActive,
    createdAt,
    updatedAt,
    setName,
    setDescription,
    setIsActive,
    assignedCount,

    // AddWarehouseSection
    allWarehouses,
    selectedWarehouse,
    setSelectedWarehouse,
    addNote,
    setAddNote,
    addWarehouse,
    selectedWarehouseInfo,

    // WarehousesTable
    assigned,               // <- canonical Assigned[]
    assignedQuery,
    setAssignedQuery,
    selectedAssigned,
    toggleAssigned,
    clearSelection,
    removeSelected,

    // Footer / general
    isLoading,
    isMutating,
    isAdding,
    onSave,
    onCancel,

    // extra
    roleCode,
    setRoleCode,
    originalRoleCode,
  };
}
