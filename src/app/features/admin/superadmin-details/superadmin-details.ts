import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { SuperAdminsApi } from '../../../core/superadmins/superadmins-api';
import { SuperAdminRecord } from '../../../core/superadmins/superadmins.models';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog';
import { SuperAdminForm, SuperAdminFormSubmission } from '../superadmin-form/superadmin-form';

type AccountAction = 'activate' | 'deactivate' | 'delete' | 'restore';

interface AccountActionDialog {
  title: string;
  description: string;
  confirmLabel: string;
  danger: boolean;
}

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-superadmin-details',
  imports: [RouterLink, ConfirmationDialog, SuperAdminForm],
  templateUrl: './superadmin-details.html',
  styleUrl: './superadmin-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminDetails {
  private readonly api = inject(SuperAdminsApi);
  private readonly session = inject(AuthSession);
  private readonly route = inject(ActivatedRoute);
  private readonly superAdminId = this.route.snapshot.paramMap.get('superAdminId') ?? '';

  protected readonly details = signal<SuperAdminRecord | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly successMessage = signal(
    this.route.snapshot.queryParamMap.get('status') === 'created'
      ? 'تم إنشاء حساب SuperAdmin بنجاح.'
      : '',
  );
  protected readonly isEditing = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly formMessages = signal<string[]>([]);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});
  protected readonly pendingAction = signal<AccountAction | null>(null);
  protected readonly actionMessages = signal<string[]>([]);
  protected readonly canUpdate = computed(() => {
    const admin = this.details();
    return (
      !!admin &&
      !admin.isRootSuperAdmin &&
      !admin.isDeleted &&
      this.session.hasPermission(PERMISSIONS.superAdminsUpdate)
    );
  });
  protected readonly canActivate = computed(() => {
    const admin = this.details();
    return (
      !!admin &&
      !admin.isRootSuperAdmin &&
      !admin.isDeleted &&
      !admin.isActive &&
      this.session.hasPermission(PERMISSIONS.superAdminsActivate)
    );
  });
  protected readonly canDeactivate = computed(() => {
    const admin = this.details();
    return (
      !!admin &&
      !admin.isRootSuperAdmin &&
      !admin.isDeleted &&
      admin.isActive &&
      this.session.hasPermission(PERMISSIONS.superAdminsDeactivate)
    );
  });
  protected readonly canDelete = computed(() => {
    const admin = this.details();
    return (
      !!admin &&
      !admin.isRootSuperAdmin &&
      !admin.isDeleted &&
      this.session.hasPermission(PERMISSIONS.superAdminsDelete)
    );
  });
  protected readonly canRestore = computed(() => {
    const admin = this.details();
    return (
      !!admin &&
      !admin.isRootSuperAdmin &&
      admin.isDeleted &&
      this.session.hasPermission(PERMISSIONS.superAdminsRestore)
    );
  });
  protected readonly actionDialog = computed<AccountActionDialog>(() => {
    const action = this.pendingAction() ?? 'activate';
    return {
      activate: {
        title: 'تفعيل حساب المشرف',
        description:
          'سيصبح بإمكان المستخدم تسجيل الدخول مرة أخرى. لا تؤثر العملية على حالة حذف السجل.',
        confirmLabel: 'تأكيد التفعيل',
        danger: false,
      },
      deactivate: {
        title: 'تعطيل حساب المشرف',
        description:
          'لن يستطيع المستخدم تسجيل الدخول بعد التنفيذ، لكن السجل سيظل موجودًا ويمكن إعادة تفعيله لاحقًا.',
        confirmLabel: 'تأكيد التعطيل',
        danger: true,
      },
      delete: {
        title: 'حذف حساب المشرف',
        description:
          'هذا حذف مبدئي قابل للاستعادة. سيتوقف الحساب فورًا عن تسجيل الدخول، وسيظل السجل محفوظًا لاستعادته لاحقًا.',
        confirmLabel: 'تأكيد الحذف',
        danger: true,
      },
      restore: {
        title: 'استعادة حساب المشرف',
        description:
          'ستُلغى حالة الحذف ويعود الحساب نشطًا مع الاحتفاظ بربط الأدوار الموجود في النظام.',
        confirmLabel: 'تأكيد الاستعادة',
        danger: false,
      },
    }[action];
  });

  constructor() {
    if (!GUID_PATTERN.test(this.superAdminId)) {
      this.isLoading.set(false);
      this.apiMessages.set(['معرّف المشرف غير صالح. ارجع إلى القائمة واختر الحساب من جديد.']);
      return;
    }
    void this.load();
  }

  protected async load(): Promise<void> {
    if (!GUID_PATTERN.test(this.superAdminId)) return;
    this.isLoading.set(true);
    this.apiMessages.set([]);
    try {
      this.details.set(await firstValueFrom(this.api.details(this.superAdminId)));
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.apiMessages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected startEditing(): void {
    if (!this.canUpdate()) return;
    this.formMessages.set([]);
    this.fieldErrors.set({});
    this.successMessage.set('');
    this.isEditing.set(true);
  }

  protected cancelEditing(): void {
    if (this.isSubmitting()) return;
    this.isEditing.set(false);
    this.formMessages.set([]);
    this.fieldErrors.set({});
  }

  protected async update(submission: SuperAdminFormSubmission): Promise<void> {
    if (submission.mode !== 'update' || !this.canUpdate() || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.formMessages.set([]);
    this.fieldErrors.set({});
    try {
      const updated = await firstValueFrom(this.api.update(this.superAdminId, submission.request));
      this.details.set(updated);
      this.isEditing.set(false);
      this.successMessage.set('تم تحديث بيانات المشرف بنجاح.');
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.formMessages.set(parsed.messages);
      this.fieldErrors.set(parsed.fields);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected openAction(action: AccountAction): void {
    if (!this.actionAllowed(action)) return;
    this.actionMessages.set([]);
    this.successMessage.set('');
    this.pendingAction.set(action);
  }

  protected dismissAction(): void {
    if (this.isSubmitting()) return;
    this.pendingAction.set(null);
    this.actionMessages.set([]);
  }

  protected async confirmAction(): Promise<void> {
    const action = this.pendingAction();
    if (!action || this.isSubmitting()) return;
    if (!this.actionAllowed(action)) return;
    this.isSubmitting.set(true);
    this.actionMessages.set([]);
    try {
      await firstValueFrom(this.api[action](this.superAdminId));
      this.details.update((admin) => (admin ? this.applyAction(admin, action) : admin));
      this.pendingAction.set(null);
      this.successMessage.set(this.actionSuccessMessage(action));
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.actionMessages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private actionAllowed(action: AccountAction): boolean {
    return {
      activate: this.canActivate(),
      deactivate: this.canDeactivate(),
      delete: this.canDelete(),
      restore: this.canRestore(),
    }[action];
  }

  private applyAction(admin: SuperAdminRecord, action: AccountAction): SuperAdminRecord {
    return {
      ...admin,
      isActive: action === 'activate' || action === 'restore',
      isDeleted: action === 'delete' ? true : action === 'restore' ? false : admin.isDeleted,
    };
  }

  private actionSuccessMessage(action: AccountAction): string {
    return {
      activate: 'تم تفعيل الحساب وأصبح بإمكان المستخدم تسجيل الدخول.',
      deactivate: 'تم تعطيل الحساب ولن يستطيع المستخدم تسجيل الدخول حتى إعادة تفعيله.',
      delete: 'تم حذف الحساب مبدئيًا وتعطيل تسجيل الدخول. يمكن استعادته من السجلات المحذوفة.',
      restore: 'تمت استعادة الحساب وتفعيله بنجاح.',
    }[action];
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en' : 'ar-EG', {
          dateStyle: 'medium',
        }).format(date);
  }
}
