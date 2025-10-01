import RolesForm from "./roles-form";

export default function Page({ searchParams }: { searchParams?: { id?: string } }) {
  const initialRoleId = searchParams?.id ?? null;
  return <RolesForm initialRoleId={initialRoleId} />;
}
