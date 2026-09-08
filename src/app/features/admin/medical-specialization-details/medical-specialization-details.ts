import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { MedicalSpecializationsApi } from '../../../core/medical-specializations/medical-specializations-api';
import { MedicalSpecialization } from '../../../core/medical-specializations/medical-specializations.models';

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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly id = this.route.snapshot.paramMap.get('id');

  protected readonly isCreate = this.id === null;
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
  protected readonly isLoading = signal(!this.isCreate);
  protected readonly isSubmitting = signal(false);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});
  protected readonly canEdit = computed(() =>
    this.isCreate
      ? this.session.hasPermission(PERMISSIONS.specializationsCreate)
      : this.session.hasPermission(PERMISSIONS.specializationsUpdate) &&
        this.details()?.isDeleted === false,
  );

  constructor() {
    if (this.id) void this.load();
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.detailsForm, async () => {
      if (this.isSubmitting() || !this.canEdit()) return;
      this.isSubmitting.set(true);
      this.clearErrors();
      const value = this.model();
      const request = {
        nameAr: value.nameAr.trim(),
        nameEn: value.nameEn.trim() || null,
        descriptionAr: value.descriptionAr.trim() || null,
        descriptionEn: value.descriptionEn.trim() || null,
        sortOrder: value.sortOrder,
      };
      try {
        const response = this.isCreate
          ? await firstValueFrom(this.api.create(request))
          : await firstValueFrom(
              this.api.update(this.id!, { ...request, rowVersion: this.details()!.rowVersion }),
            );
        this.details.set(response);
        if (this.isCreate) {
          await this.router.navigate(['/admin/medical-specializations', response.id], {
            replaceUrl: true,
          });
        } else {
          this.populate(response);
        }
      } catch (error) {
        this.handleError(error);
        if (error instanceof HttpErrorResponse && error.status === 409 && !this.isCreate) {
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
    } catch (error) {
      this.handleError(error);
      if (error instanceof HttpErrorResponse && error.status === 409) await this.load();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected serverError(field: string): string {
    return this.fieldErrors()[field.toLowerCase()]?.[0] ?? '';
  }

  private async load(): Promise<void> {
    if (!this.id) return;
    this.isLoading.set(true);
    this.clearErrors();
    try {
      const response = await firstValueFrom(this.api.details(this.id));
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
}
