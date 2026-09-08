import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { SecurityGovernanceApi } from '../../../core/security-governance/security-governance-api';
import {
  RolePermissionsResponse,
  SecurityPermission,
  SecurityRole,
  isRootOnlyPermissionName,
} from '../../../core/security-governance/security-governance.models';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog';

interface PermissionGroup {
  name: string;
  permissions: SecurityPermission[];
}

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-role-details',
  imports: [RouterLink, ConfirmationDialog],
  templateUrl: './role-details.html',
  styleUrl: './role-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleDetails {
  private readonly api = inject(SecurityGovernanceApi);
  private readonly session = inject(AuthSession);
  private readonly roleId = inject(ActivatedRoute).snapshot.paramMap.get('roleId') ?? '';

  protected readonly role = signal<SecurityRole | null>(null);
  protected readonly current = signal<RolePermissionsResponse | null>(null);
  protected readonly catalog = signal<SecurityPermission[] | null>(null);
  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly notFound = signal(false);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly catalogMessages = signal<string[]>([]);
  protected readonly saveMessages = signal<string[]>([]);
  protected readonly successMessage = signal('');
  protected readonly confirmationOpen = signal(false);
  protected readonly canViewCatalog = this.session.hasPermission(PERMISSIONS.permissionsView);
  protected readonly hasManagePermission = this.session.hasPermission(
    PERMISSIONS.rolePermissionsManage,
  );
  protected readonly hasRootContext = computed(() => {
    const user = this.session.user();
    return user?.userType === 'SuperAdmin' && user.permissions.some(isRootOnlyPermissionName);
  });
  protected readonly canManage = computed(() => {
    const role = this.role();
    if (!role || !this.canViewCatalog || !this.hasManagePermission) return false;
    return role.name !== 'SuperAdmin' || this.hasRootContext();
  });
  protected readonly permissionGroups = computed<PermissionGroup[]>(() => {
    const groups = new Map<string, SecurityPermission[]>();
    for (const permission of this.catalog() ?? []) {
      const groupName = permission.name.split('.')[0] || 'Other';
      groups.set(groupName, [...(groups.get(groupName) ?? []), permission]);
    }
    return [...groups.entries()]
      .sort(([first], [second]) => first.localeCompare(second, 'en'))
      .map(([name, permissions]) => ({
        name,
        permissions: permissions.sort((first, second) =>
          first.name.localeCompare(second.name, 'en'),
        ),
      }));
  });
  protected readonly selectedCount = computed(() => this.selectedIds().size);
  protected readonly isDirty = computed(() => {
    const original = new Set(
      (this.current()?.permissions ?? []).map((permission) => permission.id),
    );
    const selected = this.selectedIds();
    return original.size !== selected.size || [...original].some((id) => !selected.has(id));
  });
  protected readonly missingCatalogPermissions = computed(() => {
    const catalogIds = new Set((this.catalog() ?? []).map((permission) => permission.id));
    return (this.current()?.permissions ?? []).filter(
      (permission) => !catalogIds.has(permission.id),
    );
  });
  protected readonly managementBlockReason = computed(() => {
    if (!this.canViewCatalog)
      return 'لا يملك الحساب صلاحية Permissions.View لتحميل كتالوج الصلاحيات.';
    if (!this.hasManagePermission)
      return 'هذه الشاشة للعرض فقط لأن الحساب لا يملك RolePermissions.Manage.';
    if (this.role()?.name === 'SuperAdmin' && !this.hasRootContext()) {
      return 'تعديل دور SuperAdmin متاح فقط في سياق Root SuperAdmin.';
    }
    return '';
  });

  constructor() {
    if (!GUID_PATTERN.test(this.roleId)) {
      this.isLoading.set(false);
      this.apiMessages.set(['معرّف الدور غير صالح. ارجع إلى قائمة الأدوار واختر الدور من جديد.']);
      return;
    }
    void this.load();
  }

  protected async load(): Promise<void> {
    if (!GUID_PATTERN.test(this.roleId)) return;
    this.isLoading.set(true);
    this.notFound.set(false);
    this.apiMessages.set([]);
    this.catalogMessages.set([]);
    this.successMessage.set('');
    try {
      const [role, current] = await Promise.all([
        firstValueFrom(this.api.roleDetails(this.roleId)),
        firstValueFrom(this.api.rolePermissions(this.roleId)),
      ]);
      this.role.set(role);
      this.current.set(current);
      this.selectedIds.set(new Set(current.permissions.map((permission) => permission.id)));
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.notFound.set(parsed.status === 404);
      this.apiMessages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
      this.isLoading.set(false);
      return;
    }

    if (this.canViewCatalog) {
      try {
        this.catalog.set(await firstValueFrom(this.api.permissions()));
      } catch (error) {
        const parsed = parseApiErrors(error);
        this.catalogMessages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
      }
    } else {
      this.catalog.set(null);
    }
    this.isLoading.set(false);
  }

  protected isSelected(permissionId: string): boolean {
    return this.selectedIds().has(permissionId);
  }

  protected isRootOnly(permission: SecurityPermission): boolean {
    return isRootOnlyPermissionName(permission.name);
  }

  protected isAssignable(permission: SecurityPermission): boolean {
    return this.canManage() && permission.isSystemPermission && !this.isRootOnly(permission);
  }

  protected togglePermission(permission: SecurityPermission, event: Event): void {
    if (!this.isAssignable(permission) || this.isSaving()) return;
    const selected = new Set(this.selectedIds());
    (event.target as HTMLInputElement).checked
      ? selected.add(permission.id)
      : selected.delete(permission.id);
    this.selectedIds.set(selected);
    this.successMessage.set('');
  }

  protected openConfirmation(): void {
    if (!this.canManage() || !this.isDirty() || this.isSaving()) return;
    this.saveMessages.set([]);
    this.confirmationOpen.set(true);
  }

  protected dismissConfirmation(): void {
    if (this.isSaving()) return;
    this.confirmationOpen.set(false);
    this.saveMessages.set([]);
  }

  protected resetSelection(): void {
    if (this.isSaving()) return;
    this.selectedIds.set(
      new Set((this.current()?.permissions ?? []).map((permission) => permission.id)),
    );
    this.successMessage.set('');
  }

  protected async save(): Promise<void> {
    if (!this.canManage() || !this.isDirty() || this.isSaving()) return;
    this.isSaving.set(true);
    this.saveMessages.set([]);
    try {
      const response = await firstValueFrom(
        this.api.replaceRolePermissions(this.roleId, {
          permissionIds: [...this.selectedIds()],
        }),
      );
      this.current.set(response);
      this.selectedIds.set(new Set(response.permissions.map((permission) => permission.id)));
      this.confirmationOpen.set(false);
      this.successMessage.set('تم استبدال صلاحيات الدور ومزامنة الاختيارات من استجابة الخادم.');
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.saveMessages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
    } finally {
      this.isSaving.set(false);
    }
  }
}
