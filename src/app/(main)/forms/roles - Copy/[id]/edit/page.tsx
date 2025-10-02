"use client";

import { useParams } from "next/navigation";
import RolesForm from "../../roles-form";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <RolesForm initialRoleId={id ?? null} />;
}
