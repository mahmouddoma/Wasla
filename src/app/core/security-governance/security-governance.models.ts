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
  return name.startsWith('SuperAdmins.');
}
