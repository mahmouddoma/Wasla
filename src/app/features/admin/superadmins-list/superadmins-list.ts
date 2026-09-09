import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormField, form, maxLength } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { SuperAdminsApi } from '../../../core/superadmins/superadmins-api';
import { SuperAdminRecord, SuperAdminsPage } from '../../../core/superadmins/superadmins.models';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog';

type ListAction = 'delete' | 'restore';

interface PendingListAction {
  action: ListAction;
  admin: SuperAdminRecord;
}

@Component({
  selector: 'app-superadmins-list',
  imports: [FormField, RouterLink, PageHeader, ConfirmationDialog],
  templateUrl: './superadmins-list.html',
  styleUrls: ['../management-list.css', './superadmins-list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminsList {
  private readonly api = inject(SuperAdminsApi);
  private readonly session = inject(AuthSession);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private loadSequence = 0;

  protected readonly filterModel = signal({ searchText: '' });
  protected readonly filterForm = form(this.filterModel, (field) => {
    maxLength(field.searchText, 200, { message: 'الحد الأقصى للبحث 200 حرف.' });
  });
  protected readonly includeDeleted = signal(false);
  protected readonly pageNumber = signal(1);
  protected readonly pageSize = 20;
  protected readonly result = signal<SuperAdminsPage | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly successMessage = signal('');
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});
  protected readonly pendingAction = signal<PendingListAction | null>(null);
  protected readonly isActionSubmitting = signal(false);
  protected readonly actionMessages = signal<string[]>([]);
  protected readonly canViewDetails = this.session.hasPermission(
    PERMISSIONS.superAdminsViewDetails,
  );
  protected readonly canCreate = this.session.hasPermission(PERMISSIONS.superAdminsCreate);
  protected readonly canDelete = this.session.hasPermission(PERMISSIONS.superAdminsDelete);
  protected readonly canRestore = this.session.hasPermission(PERMISSIONS.superAdminsRestore);
  protected readonly totalPages = computed(() =>
    Math.max(
      1,
      Math.ceil((this.result()?.totalCount ?? 0) / (this.result()?.pageSize ?? this.pageSize)),
    ),
  );
  protected readonly searchError = computed(() => this.fieldErrors()['searchtext']?.[0] ?? '');
  protected readonly actionDialog = computed(() => {
    const pending = this.pendingAction();
    const name = pending?.admin.nameAr ?? 'هذا المشرف';
    return pending?.action === 'restore'
      ? {
          title: 'استعادة حساب المشرف',
          description: `سيعود حساب ${name} نشطًا مع إلغاء حالة الحذف والاحتفاظ بربط الأدوار.`,
          confirmLabel: 'تأكيد الاستعادة',
          danger: false,
        }
      : {
          title: 'حذف حساب المشرف',
          description: `سيُحذف حساب ${name} مبدئيًا ويتوقف عن تسجيل الدخول فورًا. يمكن استعادته لاحقًا من السجلات المحذوفة.`,
          confirmLabel: 'تأكيد الحذف',
          danger: true,
        };
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
    });
    void this.load();
  }

  protected scheduleSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.pageNumber.set(1);
      void this.load();
    }, 350);
  }

  protected clearSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.filterModel.set({ searchText: '' });
    this.filterForm().reset();
    this.pageNumber.set(1);
    void this.load();
  }

  protected toggleDeleted(event: Event): void {
    this.includeDeleted.set((event.target as HTMLInputElement).checked);
    this.pageNumber.set(1);
    void this.load();
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) return;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.pageNumber.set(page);
    void this.load();
  }

  protected canDeleteRecord(admin: SuperAdminRecord): boolean {
    return this.canDelete && !admin.isRootSuperAdmin && !admin.isDeleted;
  }

  protected canRestoreRecord(admin: SuperAdminRecord): boolean {
    return this.canRestore && !admin.isRootSuperAdmin && admin.isDeleted;
  }

  protected openAction(action: ListAction, admin: SuperAdminRecord): void {
    if (
      (action === 'delete' && !this.canDeleteRecord(admin)) ||
      (action === 'restore' && !this.canRestoreRecord(admin))
    )
      return;
    this.actionMessages.set([]);
    this.successMessage.set('');
    this.pendingAction.set({ action, admin });
  }

  protected dismissAction(): void {
    if (this.isActionSubmitting()) return;
    this.pendingAction.set(null);
    this.actionMessages.set([]);
  }

  protected async confirmAction(): Promise<void> {
    const pending = this.pendingAction();
    if (!pending || this.isActionSubmitting()) return;
    if (
      (pending.action === 'delete' && !this.canDeleteRecord(pending.admin)) ||
      (pending.action === 'restore' && !this.canRestoreRecord(pending.admin))
    )
      return;
    this.isActionSubmitting.set(true);
    this.actionMessages.set([]);
    try {
      await firstValueFrom(this.api[pending.action](pending.admin.superAdminId));
      this.applyActionResult(pending);
      this.pendingAction.set(null);
      this.successMessage.set(
        pending.action === 'delete'
          ? 'تم حذف الحساب مبدئيًا وتعطيل تسجيل الدخول.'
          : 'تمت استعادة الحساب وتفعيله بنجاح.',
      );
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.actionMessages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
    } finally {
      this.isActionSubmitting.set(false);
    }
  }

  protected async load(): Promise<void> {
    if (this.filterForm().invalid()) return;
    const sequence = ++this.loadSequence;
    this.isLoading.set(true);
    this.apiMessages.set([]);
    this.fieldErrors.set({});
    try {
      const searchText = this.filterModel().searchText.trim();
      const response = await firstValueFrom(
        this.api.list({
          searchText: searchText || undefined,
          pageNumber: this.pageNumber(),
          pageSize: this.pageSize,
          includeDeleted: this.includeDeleted(),
        }),
      );
      if (sequence !== this.loadSequence) return;
      this.result.set(response);
      this.pageNumber.set(response.pageNumber);
    } catch (error) {
      if (sequence !== this.loadSequence) return;
      const parsed = parseApiErrors(error);
      this.apiMessages.set([
        ...parsed.messages,
        ...Object.entries(parsed.fields)
          .filter(([field]) => field !== 'searchtext')
          .flatMap(([, messages]) => messages),
      ]);
      this.fieldErrors.set(parsed.fields);
    } finally {
      if (sequence === this.loadSequence) this.isLoading.set(false);
    }
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en' : 'ar-EG', {
          dateStyle: 'medium',
        }).format(date);
  }

  private applyActionResult(pending: PendingListAction): void {
    this.result.update((page) => {
      if (!page) return page;
      if (pending.action === 'delete' && !this.includeDeleted()) {
        return {
          ...page,
          items: page.items.filter((admin) => admin.superAdminId !== pending.admin.superAdminId),
          totalCount: Math.max(0, page.totalCount - 1),
        };
      }
      return {
        ...page,
        items: page.items.map((admin) =>
          admin.superAdminId === pending.admin.superAdminId
            ? {
                ...admin,
                isDeleted: pending.action === 'delete',
                isActive: pending.action === 'restore',
              }
            : admin,
        ),
      };
    });
    if (!this.result()?.items.length && this.pageNumber() > 1) {
      this.pageNumber.update((page) => page - 1);
      void this.load();
    }
  }
}
