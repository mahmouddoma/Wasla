import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { email, FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../core/auth/api-errors';
import { AuthSession } from '../../core/auth/auth-session';
import { PERMISSIONS } from '../../core/auth/permissions';
import { DoctorPractice } from '../../core/doctor-practices/doctor-practice.models';
import { DoctorPracticesApi } from '../../core/doctor-practices/doctor-practices-api';
import {
  DoctorReception,
  DoctorReceptionAssignment,
  ReceptionAssignmentPermission,
} from '../../core/doctor-receptions/doctor-reception.models';
import { DoctorReceptionsApi } from '../../core/doctor-receptions/doctor-receptions-api';
import { ToastService } from '../../core/notifications/toast.service';

@Component({
  selector: 'app-doctor-receptions',
  imports: [FormField, RouterLink],
  templateUrl: './doctor-receptions.html',
  styleUrls: ['../healthcare-workspace.css', './doctor-receptions.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorReceptions {
  private readonly api = inject(DoctorReceptionsApi);
  private readonly practicesApi = inject(DoctorPracticesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  protected readonly receptionId = this.route.snapshot.paramMap.get('receptionId');
  protected readonly isCreate = this.route.snapshot.routeConfig?.path === 'doctor/receptions/new';
  protected readonly canManageUsers = this.session.hasPermission(
    PERMISSIONS.receptionUsersManageOwn,
  );
  protected readonly canManageAssignments = this.session.hasPermission(
    PERMISSIONS.receptionAssignmentsManageOwn,
  );
  protected readonly receptions = signal<DoctorReception[]>([]);
  protected readonly reception = signal<DoctorReception | null>(null);
  protected readonly practices = signal<DoctorPractice[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly messages = signal<string[]>([]);
  protected readonly notFound = signal(false);
  protected readonly forbidden = signal(false);
  protected readonly selectedPracticeId = signal('');
  protected readonly selectedPermissionIds = signal<string[]>([]);
  protected readonly editingAssignmentId = signal<string | null>(null);
  protected readonly permissionOptions = computed(() => {
    const map = new Map<string, ReceptionAssignmentPermission>();
    for (const assignment of this.reception()?.assignments ?? [])
      for (const permission of assignment.permissions) map.set(permission.id, permission);
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  });
  protected readonly userModel = signal({
    userName: '',
    email: '',
    phoneNumber: '',
    temporaryPassword: '',
    nameAr: '',
    nameEn: '',
  });
  protected readonly userForm = form(this.userModel, (field) => {
    required(field.userName, { message: 'اسم المستخدم مطلوب.' });
    required(field.email, { message: 'البريد الإلكتروني مطلوب.' });
    email(field.email, { message: 'البريد الإلكتروني غير صحيح.' });
    required(field.nameAr, { message: 'الاسم بالعربية مطلوب.' });
    maxLength(field.nameAr, 200);
    maxLength(field.nameEn, 200);
  });

  constructor() {
    void this.load();
  }

  protected async create(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.userForm, async () => {
      if (!this.canManageUsers || this.isSubmitting()) return;
      this.isSubmitting.set(true);
      try {
        const value = this.userModel();
        const created = await firstValueFrom(
          this.api.create({
            userName: value.userName.trim(),
            email: value.email.trim(),
            phoneNumber: value.phoneNumber.trim() || null,
            temporaryPassword: value.temporaryPassword || null,
            nameAr: value.nameAr.trim(),
            nameEn: value.nameEn.trim() || null,
          }),
        );
        this.toast.success('تم إنشاء حساب الاستقبال. يمكنك الآن ربطه بالعيادات.');
        await this.router.navigate(['/doctor/receptions', created.id]);
      } catch (error) {
        this.setErrors(error);
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }

  protected togglePermission(id: string, checked: boolean): void {
    this.selectedPermissionIds.update((ids) =>
      checked ? [...new Set([...ids, id])] : ids.filter((value) => value !== id),
    );
  }

  protected editAssignment(assignment: DoctorReceptionAssignment): void {
    this.editingAssignmentId.set(assignment.id);
    this.selectedPracticeId.set(assignment.doctorPracticeId);
    this.selectedPermissionIds.set(assignment.permissions.map((item) => item.id));
  }

  protected cancelAssignmentEdit(): void {
    this.editingAssignmentId.set(null);
    this.selectedPracticeId.set('');
    this.selectedPermissionIds.set([]);
  }

  protected async saveAssignment(): Promise<void> {
    const current = this.reception();
    if (!current || this.isSubmitting() || !this.selectedPermissionIds().length) {
      this.messages.set(['اختر صلاحية واحدة على الأقل.']);
      return;
    }
    if (!this.editingAssignmentId() && !this.selectedPracticeId()) {
      this.messages.set(['اختر العيادة.']);
      return;
    }
    this.isSubmitting.set(true);
    this.messages.set([]);
    try {
      const editing = current.assignments.find((item) => item.id === this.editingAssignmentId());
      if (editing)
        await firstValueFrom(
          this.api.updateAssignment(current.id, editing.id, {
            permissionIds: this.selectedPermissionIds(),
            rowVersion: editing.rowVersion,
          }),
        );
      else
        await firstValueFrom(
          this.api.assign(current.id, {
            doctorPracticeId: this.selectedPracticeId(),
            permissionIds: this.selectedPermissionIds(),
          }),
        );
      await this.loadDetails(current.id);
      this.cancelAssignmentEdit();
      this.toast.success(editing ? 'تم تحديث صلاحيات الربط.' : 'تم ربط موظف الاستقبال بالعيادة.');
    } catch (error) {
      this.setErrors(error);
      if (error instanceof HttpErrorResponse && error.status === 409)
        await this.loadDetails(current.id);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async toggleAssignment(assignment: DoctorReceptionAssignment): Promise<void> {
    const current = this.reception();
    if (!current || this.isSubmitting()) return;
    if (assignment.isActive && !window.confirm('تعطيل وصول موظف الاستقبال لهذه العيادة فقط؟'))
      return;
    this.isSubmitting.set(true);
    try {
      const request = { rowVersion: assignment.rowVersion };
      if (assignment.isActive)
        await firstValueFrom(this.api.deactivateAssignment(current.id, assignment.id, request));
      else await firstValueFrom(this.api.activateAssignment(current.id, assignment.id, request));
      await this.loadDetails(current.id);
      this.toast.success(assignment.isActive ? 'تم تعطيل الربط فقط.' : 'تم تفعيل الربط.');
    } catch (error) {
      this.setErrors(error);
      if (error instanceof HttpErrorResponse && (error.status === 404 || error.status === 409))
        await this.loadDetails(current.id);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      if (this.receptionId) await this.loadDetails(this.receptionId);
      else if (!this.isCreate) this.receptions.set(await firstValueFrom(this.api.list()));
      if (this.receptionId && this.canManageAssignments)
        this.practices.set(await firstValueFrom(this.practicesApi.list()));
    } catch (error) {
      this.setErrors(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadDetails(id: string): Promise<void> {
    this.reception.set(await firstValueFrom(this.api.details(id)));
  }
  private setErrors(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      this.notFound.set(error.status === 404);
      this.forbidden.set(error.status === 403);
    }
    const parsed = parseApiErrors(error);
    this.messages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
  }
}
