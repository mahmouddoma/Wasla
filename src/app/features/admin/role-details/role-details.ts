import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
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
import { isGuid } from '../../../core/validation/guid';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog';

export interface PermissionGroup {
  name: string;
  permissions: SecurityPermission[];
}

const MODULE_ARABIC_NAMES: Record<string, string> = {
  DoctorOnboarding: 'تأهيل الأطباء',
  DoctorPracticeBranding: 'الهوية والمظهر للطبيب',
  DoctorPracticeConfiguration: 'إعدادات ممارسة الطبيب',
  DoctorPracticeLocation: 'مواقع وعيادات الطبيب',
  DoctorSpecializationRequests: 'طلبات تخصصات الأطباء',
  MedicalSpecializations: 'التخصصات الطبية',
  SuperAdmins: 'إدارة المشرفين',
  Roles: 'الأدوار والصلاحيات',
  Permissions: 'كتالوج الصلاحيات',
  Patients: 'سجلات المرضى',
  Families: 'العلاقات العائلية',
  DoctorProfile: 'الملف الشخصي للطبيب',
  Reception: 'الاستقبال والمواعيد',
  SecurityGovernance: 'الحوكمة والأمان',
  DoctorPracticeSchedule: 'جدول مواعيد الطبيب',
  DoctorPracticeSegments: 'شرائح ممارسة الطبيب',
  DoctorPracticePricing: 'تسعير ممارسة الطبيب',
  DoctorPractices: 'ممارسات الأطباء',
  DoctorSpecializations: 'تخصصات الأطباء',
  Doctors: 'الأطباء',
  Specializations: 'التخصصات',
  PatientContacts: 'جهات اتصال المرضى',
  PatientProfile: 'ملف المريض',
  PracticePayments: 'المدفوعات',
  PracticeQueue: 'قائمة الانتظار',
  PracticeReservations: 'الحجوزات',
  PracticeWalkIns: 'الزيارات المباشرة',
  ReceptionAssignments: 'مهام الاستقبال',
  ReceptionUsers: 'مستخدمو الاستقبال',
  RolePermissions: 'صلاحيات الأدوار',
  FamilyRelationshipRequests: 'طلبات العلاقات العائلية',
};

const ACTION_ARABIC_NAMES: Record<string, string> = {
  View: 'عرض',
  ViewOwn: 'عرض (خاص)',
  ViewAll: 'عرض الكل',
  ViewDetails: 'عرض التفاصيل',
  ViewAssisted: 'عرض مساعد',
  Manage: 'إدارة',
  ManageOwn: 'إدارة (خاص)',
  Create: 'إنشاء',
  Update: 'تعديل',
  Delete: 'حذف',
  Activate: 'تفعيل',
  ActivateOwn: 'تفعيل (خاص)',
  Deactivate: 'تعطيل',
  Suspend: 'إيقاف',
  Approve: 'موافقة',
  Reject: 'رفض',
  Restore: 'استعادة',
  Record: 'تسجيل',
  Register: 'تسجيل مريض',
  SearchBasic: 'بحث أساسي',
  SubmitOwn: 'إرسال (خاص)',
  ResubmitOwn: 'إعادة إرسال (خاص)',
  ResubmitAssisted: 'إعادة إرسال مساعد',
  RequestModification: 'طلب تعديل',
  Adjust: 'ضبط',
};

function splitCamelCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1 $2');
}

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
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly routeRoleId = this.route?.snapshot.paramMap.get('roleId') ?? '';

  readonly roleIdInput = input<string | null>(null);
  readonly isDrawer = input(false);
  readonly closed = output<void>();
  readonly saved = output<RolePermissionsResponse>();

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
  protected readonly permissionSearch = signal('');
  protected readonly filterMode = signal<'all' | 'selected' | 'unselected'>('all');
  protected readonly idCopied = signal(false);

  protected readonly canViewCatalog = this.session.hasPermission(PERMISSIONS.permissionsView);
  protected readonly hasManagePermission = this.session.hasPermission(
    PERMISSIONS.rolePermissionsManage,
  );

  protected readonly activeRoleId = computed(() => this.roleIdInput() || this.routeRoleId);

  protected readonly hasRootContext = computed(() => {
    const user = this.session.user();
    return user?.userType === 'SuperAdmin' && user.permissions.some(isRootOnlyPermissionName);
  });

  protected readonly canManage = computed(() => {
    const role = this.role();
    if (!role || !this.canViewCatalog || !this.hasManagePermission) return false;
    return role.name !== 'SuperAdmin' || this.hasRootContext();
  });

  protected readonly totalCatalogCount = computed(() => this.catalog()?.length ?? 0);
  protected readonly selectedCount = computed(() => this.selectedIds().size);
  protected readonly unselectedCount = computed(() =>
    Math.max(0, this.totalCatalogCount() - this.selectedCount()),
  );

  protected readonly filteredPermissionGroups = computed<PermissionGroup[]>(() => {
    const query = this.permissionSearch().trim().toLowerCase();
    const mode = this.filterMode();
    const selected = this.selectedIds();
    const groups = new Map<string, SecurityPermission[]>();

    for (const permission of this.catalog() ?? []) {
      const isSel = selected.has(permission.id);
      if (mode === 'selected' && !isSel) continue;
      if (mode === 'unselected' && isSel) continue;

      if (query) {
        const matchName = permission.name.toLowerCase().includes(query);
        const matchId = permission.id.toLowerCase().includes(query);
        const groupKey = permission.name.split('.')[0] || '';
        const matchArabic = (MODULE_ARABIC_NAMES[groupKey] || '').toLowerCase().includes(query);
        if (!matchName && !matchId && !matchArabic) continue;
      }

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

  private loadedRoleId = '';

  constructor() {
    effect(() => {
      const id = this.activeRoleId();
      untracked(() => {
        if (!id) return;
        if (id === this.loadedRoleId) return;
        if (!isGuid(id)) {
          this.isLoading.set(false);
          this.apiMessages.set([
            'معرّف الدور غير صالح. ارجع إلى قائمة الأدوار واختر الدور من جديد.',
          ]);
          return;
        }
        this.loadedRoleId = id;
        void this.load(id);
      });
    });
  }

  protected async load(targetId?: string): Promise<void> {
    const id = targetId || this.activeRoleId();
    if (!id || !isGuid(id)) return;
    this.isLoading.set(true);
    this.notFound.set(false);
    this.apiMessages.set([]);
    this.catalogMessages.set([]);
    this.successMessage.set('');
    try {
      const [role, current] = await Promise.all([
        firstValueFrom(this.api.roleDetails(id)),
        firstValueFrom(this.api.rolePermissions(id)),
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

  protected getModuleArabic(groupName: string): string {
    return MODULE_ARABIC_NAMES[groupName] || groupName;
  }

  protected getActionName(permissionName: string): string {
    const parts = permissionName.split('.');
    const raw = parts.length > 1 ? parts.slice(1).join('.') : permissionName;
    return splitCamelCase(raw);
  }

  protected getActionArabic(permissionName: string): string {
    const parts = permissionName.split('.');
    const action = parts.length > 1 ? parts.slice(1).join('.') : permissionName;
    return ACTION_ARABIC_NAMES[action] || '';
  }

  protected getGroupSelectedCount(group: PermissionGroup): number {
    const selected = this.selectedIds();
    return group.permissions.filter((p) => selected.has(p.id)).length;
  }

  protected isGroupFullySelected(group: PermissionGroup): boolean {
    const assignable = group.permissions.filter((p) => this.isAssignable(p));
    if (!assignable.length) return false;
    return assignable.every((p) => this.isSelected(p.id));
  }

  protected toggleGroupSelection(group: PermissionGroup): void {
    if (!this.canManage() || this.isSaving()) return;
    const assignable = group.permissions.filter((p) => this.isAssignable(p));
    const allSelected = this.isGroupFullySelected(group);
    const next = new Set(this.selectedIds());
    for (const p of assignable) {
      if (allSelected) {
        next.delete(p.id);
      } else {
        next.add(p.id);
      }
    }
    this.selectedIds.set(next);
    this.successMessage.set('');
  }

  protected selectAllFiltered(): void {
    if (!this.canManage() || this.isSaving()) return;
    const next = new Set(this.selectedIds());
    for (const group of this.filteredPermissionGroups()) {
      for (const p of group.permissions) {
        if (this.isAssignable(p)) {
          next.add(p.id);
        }
      }
    }
    this.selectedIds.set(next);
    this.successMessage.set('');
  }

  protected deselectAllFiltered(): void {
    if (!this.canManage() || this.isSaving()) return;
    const next = new Set(this.selectedIds());
    for (const group of this.filteredPermissionGroups()) {
      for (const p of group.permissions) {
        if (this.isAssignable(p)) {
          next.delete(p.id);
        }
      }
    }
    this.selectedIds.set(next);
    this.successMessage.set('');
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

  protected onSearchInput(event: Event): void {
    this.permissionSearch.set((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.permissionSearch.set('');
  }

  protected setFilterMode(mode: 'all' | 'selected' | 'unselected'): void {
    this.filterMode.set(mode);
  }

  protected copyRoleId(): void {
    const id = this.role()?.id;
    if (id && navigator.clipboard) {
      void navigator.clipboard.writeText(id);
      this.idCopied.set(true);
      setTimeout(() => this.idCopied.set(false), 2000);
    }
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
    const id = this.activeRoleId();
    if (!id || !this.canManage() || !this.isDirty() || this.isSaving()) return;
    this.isSaving.set(true);
    this.saveMessages.set([]);
    try {
      const response = await firstValueFrom(
        this.api.replaceRolePermissions(id, {
          permissionIds: [...this.selectedIds()],
        }),
      );
      this.current.set(response);
      this.selectedIds.set(new Set(response.permissions.map((permission) => permission.id)));
      this.confirmationOpen.set(false);
      this.successMessage.set('تم استبدال وحفظ صلاحيات الدور بنجاح.');
      this.saved.emit(response);
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.saveMessages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
    } finally {
      this.isSaving.set(false);
    }
  }
}
