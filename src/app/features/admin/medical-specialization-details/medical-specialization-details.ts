import { HttpErrorResponse } from '@angular/common/http';
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
import { FormField, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { MedicalSpecializationsApi } from '../../../core/medical-specializations/medical-specializations-api';
import { MedicalSpecialization } from '../../../core/medical-specializations/medical-specializations.models';
import { ToastService } from '../../../core/notifications/toast.service';

type LifecycleAction = 'activate' | 'deactivate' | 'delete' | 'restore';

@Component({
  selector: 'app-medical-specialization-details',
  imports: [FormField, RouterLink],
  templateUrl: './medical-specialization-details.html',
  styleUrl: './medical-specialization-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MedicalSpecializationDetails {
  private readonly api = inject(MedicalSpecializationsApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });
  private readonly routeId = this.route?.snapshot.paramMap.get('id') ?? null;

  readonly specIdInput = input<string | null>(null);
  readonly isDrawer = input(false);
  readonly saved = output<MedicalSpecialization>();
  readonly closed = output<void>();

  protected readonly activeId = computed(() => this.specIdInput() || this.routeId);
  protected readonly isCreate = computed(() => this.activeId() === null);
  protected readonly details = signal<MedicalSpecialization | null>(null);
  protected readonly model = signal({
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    sortOrder: 0,
  });
  protected readonly detailsForm = form(this.model, (field) => {
    required(field.nameAr, { message: 'الاسم العربي مطلوب.' });
    maxLength(field.nameAr, 200, { message: 'الحد الأقصى 200 حرف.' });
    maxLength(field.nameEn, 200, { message: 'الحد الأقصى 200 حرف.' });
    maxLength(field.descriptionAr, 1000, { message: 'الحد الأقصى 1000 حرف.' });
    maxLength(field.descriptionEn, 1000, { message: 'الحد الأقصى 1000 حرف.' });
    min(field.sortOrder, 0, { message: 'الترتيب لا يمكن أن يكون سالبًا.' });
    max(field.sortOrder, 2147483647, { message: 'قيمة الترتيب غير صالحة.' });
  });
  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});
  protected readonly canEdit = computed(() =>
    this.isCreate()
      ? this.session.hasPermission(PERMISSIONS.specializationsCreate)
      : this.session.hasPermission(PERMISSIONS.specializationsUpdate) &&
        this.details()?.isDeleted === false,
  );

  private loadedId = '';

  constructor() {
    effect(() => {
      const id = this.activeId();
      untracked(() => {
        if (!id) {
          this.loadedId = '';
          this.details.set(null);
          this.model.set({
            nameAr: '',
            nameEn: '',
            descriptionAr: '',
            descriptionEn: '',
            sortOrder: 0,
          });
          this.detailsForm().reset();
          this.clearErrors();
          return;
        }
        if (id === this.loadedId) return;
        this.loadedId = id;
        void this.load(id);
      });
    });
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.detailsForm, async () => {
      if (this.isSubmitting() || !this.canEdit()) return;
      this.isSubmitting.set(true);
      this.clearErrors();
      const value = this.model();
      const id = this.activeId();
      const request = {
        nameAr: value.nameAr.trim(),
        nameEn: value.nameEn.trim() || null,
        descriptionAr: value.descriptionAr.trim() || null,
        descriptionEn: value.descriptionEn.trim() || null,
        sortOrder: value.sortOrder,
      };
      try {
        const creating = this.isCreate();
        const response = creating
          ? await firstValueFrom(this.api.create(request))
          : await firstValueFrom(
              this.api.update(id!, { ...request, rowVersion: this.details()!.rowVersion }),
            );
        this.details.set(response);
        this.saved.emit(response);
        this.toast.success(
          creating
            ? 'تمت إضافة التخصص الطبي بنجاح.'
            : 'تم حفظ تعديلات التخصص الطبي بنجاح.',
        );
        if (creating) {
          if (this.isDrawer()) {
            this.loadedId = response.id;
            this.populate(response);
          } else if (this.router) {
            await this.router.navigate(['/admin/medical-specializations', response.id], {
              replaceUrl: true,
            });
          }
        } else {
          this.populate(response);
        }
      } catch (error) {
        this.handleError(error);
        if (error instanceof HttpErrorResponse && error.status === 409 && !this.isCreate()) {
          await this.load();
        }
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }

  protected can(action: LifecycleAction): boolean {
    const item = this.details();
    if (!item) return false;
    const permission = {
      activate: PERMISSIONS.specializationsActivate,
      deactivate: PERMISSIONS.specializationsDeactivate,
      delete: PERMISSIONS.specializationsDelete,
      restore: PERMISSIONS.specializationsRestore,
    }[action];
    if (!this.session.hasPermission(permission)) return false;
    if (action === 'restore') return item.isDeleted;
    if (item.isDeleted) return false;
    if (action === 'activate') return !item.isActive;
    if (action === 'deactivate') return item.isActive;
    return !item.isActive;
  }

  protected async lifecycle(action: LifecycleAction): Promise<void> {
    const item = this.details();
    if (!item || !this.can(action) || this.isSubmitting()) return;
    const labels = { activate: 'تفعيل', deactivate: 'تعطيل', delete: 'حذف', restore: 'استعادة' };
    const warning = action === 'delete' ? 'الحذف مبدئي ويمكن استعادته لاحقًا.' : '';
    if (!confirm(`تأكيد ${labels[action]} التخصص؟ ${warning}`)) return;
    this.isSubmitting.set(true);
    this.clearErrors();
    try {
      const response = await firstValueFrom(
        this.api[action](item.id, { rowVersion: item.rowVersion }),
      );
      this.details.set(response);
      this.populate(response);
      this.saved.emit(response);
      this.toast.success(this.lifecycleSuccessMessage(action));
    } catch (error) {
      this.handleError(error);
      if (error instanceof HttpErrorResponse && error.status === 409) await this.load();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected clientError(
    field: 'nameAr' | 'nameEn' | 'descriptionAr' | 'descriptionEn' | 'sortOrder',
  ): string {
    const f = this.detailsForm[field]();
    return f.touched() && f.errors().length ? (f.errors()[0] as { message: string }).message : '';
  }

  protected serverError(field: string): string {
    return this.fieldErrors()[field.toLowerCase()]?.[0] ?? '';
  }

  private async load(targetId?: string): Promise<void> {
    const id = targetId || this.activeId();
    if (!id) return;
    this.isLoading.set(true);
    this.clearErrors();
    try {
      const response = await firstValueFrom(this.api.details(id));
      this.details.set(response);
      this.populate(response);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private populate(item: MedicalSpecialization): void {
    this.model.set({
      nameAr: item.nameAr,
      nameEn: item.nameEn ?? '',
      descriptionAr: item.descriptionAr ?? '',
      descriptionEn: item.descriptionEn ?? '',
      sortOrder: item.sortOrder,
    });
    this.detailsForm().reset();
  }

  private clearErrors(): void {
    this.apiMessages.set([]);
    this.fieldErrors.set({});
  }

  private handleError(error: unknown): void {
    const parsed = parseApiErrors(error);
    this.apiMessages.set(parsed.messages);
    this.fieldErrors.set(parsed.fields);
  }

  private lifecycleSuccessMessage(action: LifecycleAction): string {
    return {
      activate: 'تم تفعيل التخصص الطبي بنجاح.',
      deactivate: 'تم تعطيل التخصص الطبي بنجاح.',
      delete: 'تم حذف التخصص الطبي مبدئيًا.',
      restore: 'تمت استعادة التخصص الطبي بنجاح.',
    }[action];
  }
}
