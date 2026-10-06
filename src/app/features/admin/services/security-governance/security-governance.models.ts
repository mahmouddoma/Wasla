export interface SecurityRole {
  id: string;
  name: string;
  isSystemRole: boolean;
}

export interface SecurityPermission {
  id: string;
  name: string;
  isSystemPermission: boolean;
}

export interface RolePermissionsResponse {
  roleId: string;
  permissions: SecurityPermission[];
}

export interface ReplaceRolePermissionsRequest {
  permissionIds: string[];
}

export function isRootOnlyPermissionName(name: string): boolean {
  return name.startsWith('SuperAdmins.') || name.startsWith('DrugCatalogManagers.');
}

/** Phase 14 allowlist; IDs are always resolved from the server catalog. */
export const DRUG_CATALOG_MANAGER_PERMISSIONS: ReadonlySet<string> = new Set([
  'DrugCatalog.View', 'DrugCatalog.Create', 'DrugCatalog.Update',
  'DrugCatalog.Activate', 'DrugCatalog.Deactivate', 'DrugCatalog.Merge',
  'DrugCatalog.Import', 'DrugCatalog.ImportHistory',
  'DrugCatalogRequests.View', 'DrugCatalogRequests.Review',
]);
