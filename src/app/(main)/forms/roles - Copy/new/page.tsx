import RolesForm from "../roles-form";

type SearchParams = { [key: string]: string | string[] | undefined };

export default function Page({ searchParams }: { searchParams?: SearchParams }) {
  const raw = searchParams?.id;
  const initialRoleId = Array.isArray(raw) ? raw[0] : raw ?? null;
  return <RolesForm initialRoleId={initialRoleId} />;
}
