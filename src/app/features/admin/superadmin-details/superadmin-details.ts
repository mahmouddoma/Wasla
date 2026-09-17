import { ToastService } from '../../../core/notifications/toast.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { SuperAdminsApi } from '../services/superadmins';
import { SuperAdminRecord } from '../services/superadmins';
import { isGuid } from '../../../core/validation/guid';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog';
import { SuperAdminForm, SuperAdminFormSubmission } from '../superadmin-form/superadmin-form';

type AccountAction = 'activate' | 'deactivate' | 'delete' | 'restore';

interface AccountActionDialog {
  title: string;
  description: string;
  confirmLabel: string;
  danger: boolean;
}

@Component({
  selector: 'app-superadmin-details',
  imports: [RouterLink, ConfirmationDialog, SuperAdminForm, TranslatePipe],
  templateUrl: './superadmin-details.html',
  styleUrl: './superadmin-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminDetails {
  private readonly toast = inject(ToastService);

  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(SuperAdminsApi);
  private readonly session = inject(AuthSession);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly routeSuperAdminId = this.route?.snapshot.paramMap.get('superAdminId') ?? '';

  readonly superAdminIdInput = input<string | null>(null);
  readonly isDrawer = input(false);
  readonly closed = output<void>();
  readonly saved = output<SuperAdminRecord>();

  protected readonly activeSuperAdminId = computed(
    () => this.superAdminIdInput() || this.routeSuperAdminId,
  );

  protected readonly details = signal<SuperAdminRecord | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly successMessage = signal(
    this.route?.snapshot.queryParamMap.get('status') === 'created'
      ? this.uiLanguage.t('ui.full.150')
      : '',
  );
  protected readonly isEditing = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly formMessages = signal<string[]>([]);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});
  protected readonly pendingAction = signal<AccountAction | null>(null);
  protected readonly actionMessages = signal<string[]>([]);
  protected readonly idCopied = signal(false);

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
        title: this.uiLanguage.t('ui.full.151'),
        description:
          this.uiLanguage.t('ui.full.152'),
        confirmLabel: this.uiLanguage.t('ui.full.153'),
        danger: false,
      },
      deactivate: {
        title: this.uiLanguage.t('ui.full.154'),
        description:
          this.uiLanguage.t('ui.full.155'),
        confirmLabel: this.uiLanguage.t('ui.full.156'),
        danger: true,
      },
      delete: {
        title: this.uiLanguage.t('admin.deleteAdministrator'),
        description:
          this.uiLanguage.t('ui.full.157'),
        confirmLabel: this.uiLanguage.t('common.confirmDelete'),
        danger: true,
      },
      restore: {
        title: this.uiLanguage.t('admin.restoreAdministrator'),
        description:
          this.uiLanguage.t('ui.full.158'),
        confirmLabel: this.uiLanguage.t('common.confirmRestore'),
        danger: false,
      },
    }[action];
  });

  constructor() {
    effect(() => {
      const id = this.activeSuperAdminId();
      if (!isGuid(id)) {
        this.isLoading.set(false);
        this.apiMessages.set([this.uiLanguage.t('ui.full.159')]);
        return;
      }
      void this.load();
    });
  }

  protected async load(): Promise<void> {
    const id = this.activeSuperAdminId();
    if (!isGuid(id)) return;
    this.isLoading.set(true);
    this.apiMessages.set([]);
    try {
      this.details.set(await firstValueFrom(this.api.details(id)));
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.apiMessages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected copyText(text: string): void {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    this.idCopied.set(true);
    setTimeout(() => this.idCopied.set(false), 2000);
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
    const id = this.activeSuperAdminId();
    if (submission.mode !== 'update' || !this.canUpdate() || this.isSubmitting() || !isGuid(id))
      return;
    this.isSubmitting.set(true);
    this.formMessages.set([]);
    this.fieldErrors.set({});
    try {
      const updated = await firstValueFrom(this.api.update(id, submission.request));
      this.details.set(updated);
      this.isEditing.set(false);
      this.successMessage.set(this.uiLanguage.t('admin.updated'));
      this.toast.success(this.successMessage());
      this.saved.emit(updated);
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
    const id = this.activeSuperAdminId();
    const action = this.pendingAction();
    if (!action || this.isSubmitting() || !isGuid(id)) return;
    if (!this.actionAllowed(action)) return;
    this.isSubmitting.set(true);
    this.actionMessages.set([]);
    try {
      await firstValueFrom(this.api[action](id));
      this.details.update((admin) => (admin ? this.applyAction(admin, action) : admin));
      const currentAdmin = this.details();
      if (currentAdmin) {
        this.saved.emit(currentAdmin);
      }
      this.pendingAction.set(null);
      this.successMessage.set(this.actionSuccessMessage(action));
      this.toast.success(this.successMessage());
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
      activate: this.uiLanguage.t('ui.full.160'),
      deactivate: this.uiLanguage.t('ui.full.161'),
      delete: this.uiLanguage.t('ui.full.162'),
      restore: this.uiLanguage.t('admin.restored'),
    }[action];
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(this.uiLanguage.currentLang() === 'en' ? 'en' : 'ar-EG', {
          dateStyle: 'medium',
        }).format(date);
  }

  protected getAdminInitial(admin: SuperAdminRecord): string {
    const name = admin.nameAr?.trim() || admin.nameEn?.trim() || admin.userName?.trim() || '';
    return name ? name.charAt(0).toUpperCase() : this.uiLanguage.t('common.pm');
  }
}
