import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { ToastService } from '../../../../core/notifications/toast.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import {
  CATALOG_MANAGER_KIND,
  DrugCatalogManagersApi,
} from '../../services/drug-catalog-managers/drug-catalog-managers-api';
import {
  DrugCatalogManager,
  ManagerPage,
} from '../../services/drug-catalog-managers/drug-catalog-managers.models';

@Component({
  selector: 'app-drug-catalog-managers',
  imports: [ReactiveFormsModule, TranslatePipe, PageHeader, SideDrawer],
  providers: [
    DrugCatalogManagersApi,
    {
      provide: CATALOG_MANAGER_KIND,
      useFactory: () =>
        inject(ActivatedRoute, { optional: true })?.snapshot.data['managerKind'] === 'medical'
          ? 'medical'
          : 'drug',
    },
  ],
  templateUrl: './drug-catalog-managers.component.html',
  styleUrls: [
    '../../../../shared/styles/directory-workspace.css',
    './drug-catalog-managers.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrugCatalogManagersComponent implements OnInit {
  readonly medical = inject(CATALOG_MANAGER_KIND) === 'medical';
  readonly managerTitle = this.medical ? 'diagnostics.managers' : 'medications.managers';
  readonly managerHelp = this.medical ? 'diagnostics.managersHelp' : 'medications.managersHelp';
  private readonly api = inject(DrugCatalogManagersApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly language = inject(LanguageService);
  readonly page = signal<ManagerPage>({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 });
  readonly search = signal('');
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly detailLoading = signal(false);
  readonly opened = signal(false);
  readonly creating = signal(false);
  readonly editing = signal(false);
  readonly detail = signal<DrugCatalogManager | null>(null);
  readonly messages = signal<string[]>([]);
  readonly pendingAction = signal<'activate' | 'deactivate' | null>(null);
  readonly form = this.fb.group({
    userName: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    phoneNumber: ['', Validators.maxLength(30)],
    initialPassword: ['', [Validators.required, Validators.maxLength(4096)]],
    confirmPassword: ['', Validators.required],
  });
  private listSequence = 0;
  private detailSequence = 0;
  ngOnInit() {
    void this.load();
  }
  allowed(action: string) {
    return (
      this.session.user()?.userType === 'SuperAdmin' &&
      this.session.hasPermission(
        (this.medical ? 'MedicalCatalogManagers.' : 'DrugCatalogManagers.') + action,
      )
    );
  }
  async load(pageNumber = 1) {
    if (!this.allowed('ViewAll') || this.busy()) return;
    const sequence = ++this.listSequence;
    this.loading.set(true);
    this.failed.set(false);
    this.messages.set([]);
    try {
      const page = await firstValueFrom(this.api.list(this.search(), pageNumber));
      if (sequence === this.listSequence) this.page.set(page);
    } catch (error) {
      if (sequence === this.listSequence) {
        this.failed.set(true);
        this.failure(error);
      }
    } finally {
      if (sequence === this.listSequence) this.loading.set(false);
    }
  }
  setSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
    void this.load();
  }
  async inspect(id: string) {
    if (!this.allowed('ViewDetails') || this.busy()) return;
    this.resetDrawer();
    this.opened.set(true);
    this.detailLoading.set(true);
    const sequence = ++this.detailSequence;
    try {
      const detail = await firstValueFrom(this.api.details(id));
      if (sequence === this.detailSequence) {
        this.detail.set(detail);
        this.setForm(detail);
      }
    } catch (error) {
      if (sequence === this.detailSequence) this.failure(error);
    } finally {
      if (sequence === this.detailSequence) this.detailLoading.set(false);
    }
  }
  create() {
    if (!this.allowed('Create') || this.busy()) return;
    this.resetDrawer();
    this.creating.set(true);
    this.editing.set(true);
    this.opened.set(true);
    this.form.controls.initialPassword.enable();
    this.form.controls.confirmPassword.enable();
  }
  edit() {
    const detail = this.detail();
    if (!detail || !this.allowed('Update') || this.busy()) return;
    this.setForm(detail);
    this.editing.set(true);
  }
  close() {
    if (!this.busy()) {
      this.detailSequence++;
      this.opened.set(false);
      this.resetDrawer();
    }
  }
  cancelEdit() {
    if (!this.busy()) {
      this.editing.set(false);
      if (this.detail()) this.setForm(this.detail()!);
    }
  }
  async save() {
    const creating = this.creating(),
      detail = this.detail();
    if (this.busy() || !this.allowed(creating ? 'Create' : 'Update') || (!creating && !detail))
      return;
    this.form.markAllAsTouched();
    const value = this.form.getRawValue();
    if (this.form.invalid || (creating && value.initialPassword !== value.confirmPassword)) {
      this.messages.set(['medications.invalidForm']);
      return;
    }
    this.busy.set(true);
    this.messages.set([]);
    let savedSuccessfully = false;
    try {
      const contact = { email: value.email.trim(), phoneNumber: value.phoneNumber.trim() || null };
      const saved = await firstValueFrom(
        creating
          ? this.api.create({
              ...contact,
              userName: value.userName.trim(),
              initialPassword: value.initialPassword,
              confirmPassword: value.confirmPassword,
            })
          : this.api.update(detail!.id, contact),
      );
      this.detail.set(saved);
      this.creating.set(false);
      this.editing.set(false);
      this.setForm(saved);
      this.toast.success('medications.saved');
      savedSuccessfully = true;
    } catch (error) {
      this.failure(error, true);
    } finally {
      this.busy.set(false);
    }
    if (savedSuccessfully) await this.load(this.page().pageNumber);
  }
  confirmAction(action: 'activate' | 'deactivate') {
    if (
      this.detail() &&
      this.allowed(action === 'activate' ? 'Activate' : 'Deactivate') &&
      !this.busy()
    )
      this.pendingAction.set(action);
  }
  async changeActive() {
    const action = this.pendingAction(),
      detail = this.detail();
    if (
      !action ||
      !detail ||
      this.busy() ||
      !this.allowed(action === 'activate' ? 'Activate' : 'Deactivate')
    )
      return;
    this.busy.set(true);
    this.messages.set([]);
    let savedSuccessfully = false;
    try {
      const saved = await firstValueFrom(
        action === 'activate' ? this.api.activate(detail.id) : this.api.deactivate(detail.id),
      );
      this.detail.set(saved);
      this.setForm(saved);
      this.pendingAction.set(null);
      this.toast.success('medications.saved');
      savedSuccessfully = true;
    } catch (error) {
      this.failure(error, true);
    } finally {
      this.busy.set(false);
    }
    if (savedSuccessfully) await this.load(this.page().pageNumber);
  }
  private setForm(detail: DrugCatalogManager) {
    this.form.reset({
      userName: detail.userName,
      email: detail.email,
      phoneNumber: detail.phoneNumber ?? '',
      initialPassword: '',
      confirmPassword: '',
    });
    this.form.controls.initialPassword.disable();
    this.form.controls.confirmPassword.disable();
  }
  private resetDrawer() {
    this.detail.set(null);
    this.creating.set(false);
    this.editing.set(false);
    this.detailLoading.set(false);
    this.pendingAction.set(null);
    this.messages.set([]);
    this.form.reset();
  }
  private failure(error: unknown, mutation = false) {
    const parsed = parseApiErrors(error);
    const messages =
      parsed.status === 404
        ? ['medications.notFound']
        : [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages);
    if (mutation) this.toast.error(messages[0] || 'medications.failed');
  }
}
