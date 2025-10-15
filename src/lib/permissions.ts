export type PermissionKey = string;

export function hasAll(required: PermissionKey[], userPerms: PermissionKey[] | undefined | null) {
  if (!required?.length) return true;
  if (!userPerms?.length) return false;
  const set = new Set(userPerms);
  return required.every((k) => set.has(k));
}

export function hasAny(required: PermissionKey[], userPerms: PermissionKey[] | undefined | null) {
  if (!required?.length) return true;
  if (!userPerms?.length) return false;
  const set = new Set(userPerms);
  return required.some((k) => set.has(k));
}
