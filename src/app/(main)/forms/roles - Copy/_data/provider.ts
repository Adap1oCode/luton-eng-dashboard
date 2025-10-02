import type { Id, Role, RoleInput, ListParams, Paged } from "./types";

export interface RolesProvider {
  listRoles(params?: ListParams): Promise<Paged<Role>>;
  getRole(id: Id): Promise<Role | null>;
  createRole(input: RoleInput): Promise<Id>;
  updateRole(id: Id, patch: RoleInput): Promise<void>;
  deleteRole(id: Id): Promise<void>;
}
