"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/auth/permissions-gate";
import RolesForm from "../../roles-form";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <PermissionGate any={["screen:roles:update"]}>
      <RolesForm initialRoleId={id ?? null} />
    </PermissionGate>
  );
}
