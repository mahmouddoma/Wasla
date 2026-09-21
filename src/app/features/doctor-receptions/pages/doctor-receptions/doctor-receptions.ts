import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { email, FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { AuthSession } from '../../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../../core/auth/permissions';
import { DoctorPractice } from '../../../../domains/doctor-practices';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import {
  DoctorReception,
  DoctorReceptionAssignment,
  ReceptionAssignmentPermission,
} from '../../services';
import { DoctorReceptionsApi } from '../../services';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';

@Component({
  selector: 'app-doctor-receptions',
  imports: [FormField, RouterLink, SideDrawer, TranslatePipe],
  templateUrl: './doctor-receptions.html',
  styleUrl: './doctor-receptions.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorReceptions {
  protected readonly langService = inject(LanguageService);
  private readonly api = inject(DoctorReceptionsApi);
  private readonly practicesApi = inject(DoctorPracticesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);

  protected readonly receptionId = this.route.snapshot.paramMap.get('receptionId');
  protected readonly isCreate = this.route.snapshot.routeConfig?.path === 'new';
  protected readonly isCreateDrawerOpen = signal(this.isCreate);
  protected readonly showPassword = signal(false);

  protected readonly canManageUsers = this.session.hasPermission(
    PERMISSIONS.receptionUsersManageOwn,
  );
  protected readonly canManageAssignments = this.session.hasPermission(
    PERMISSIONS.receptionAssignmentsManageOwn,
  );

  protected readonly receptions = signal<DoctorReception[]>([]);
  protected readonly reception = signal<DoctorReception | null>(null);
  protected readonly practices = signal<DoctorPractice[]>([]);
  protected readonly availablePermissions = signal<ReceptionAssignmentPermission[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly messages = signal<string[]>([]);
  protected readonly notFound = signal(false);
  protected readonly forbidden = signal(false);
  protected readonly selectedPracticeId = signal('');
  protected readonly selectedPermissionIds = signal<string[]>([]);
  protected readonly editingAssignmentId = signal<string | null>(null);

  protected readonly totalAssignmentsCount = computed(() =>
    this.receptions().reduce((sum, item) => sum + item.assignments.length, 0),
  );
  protected readonly activeReceptionsCount = computed(
    () => this.receptions().filter((item) => item.assignments.some((a) => a.isActive)).length,
  );

  protected readonly permissionOptions = computed(() =>
    [...this.availablePermissions()].sort((a, b) => a.code.localeCompare(b.code)),
  );

  protected readonly hasSelectedPermissions = computed(() => {
    const available = new Set(this.permissionOptions().map((permission) => permission.id));
    const selected = this.selectedPermissionIds();
    return selected.length > 0 && selected.every((id) => available.has(id));
  });

  protected readonly isAllPermissionsSelected = computed(() => {
    const options = this.permissionOptions();
    const selected = this.selectedPermissionIds();
    return options.length > 0 && selected.length === options.length;
  });

  protected selectAllPermissions(): void {
    const allIds = this.permissionOptions().map((permission) => permission.id);
    this.selectedPermissionIds.set(allIds);
  }

  protected clearAllPermissions(): void {
    this.selectedPermissionIds.set([]);
  }

  protected readonly userModel = signal({
    userName: '',
    email: '',
    phoneNumber: '',
    temporaryPassword: '',
    nameAr: '',
    nameEn: '',
  });

  protected readonly userForm = form(this.userModel, (field) => {
    required(field.userName, { message: 'ui.full.594' });
    required(field.email, { message: 'ui.full.595' });
    email(field.email, { message: 'ui.full.596' });
    required(field.nameAr, { message: 'validation.nameArRequired' });
    maxLength(field.nameAr, 200);
    maxLength(field.nameEn, 200);
  });

  constructor() {
    void this.load();
  }

  protected openCreateDrawer(): void {
    this.isCreateDrawerOpen.set(true);
  }

  protected closeCreateDrawer(): void {
    this.isCreateDrawerOpen.set(false);
    if (this.isCreate) {
      void this.router.navigate(['/doctor/receptions']);
    }
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
        this.isCreateDrawerOpen.set(false);
        this.toast.success(this.langService.t('ui.full.597'));
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
    const assignableIds = new Set(this.permissionOptions().map((item) => item.id));
    this.selectedPermissionIds.set(
      assignment.permissions.filter((item) => assignableIds.has(item.id)).map((item) => item.id),
    );
  }

  protected cancelAssignmentEdit(): void {
    this.editingAssignmentId.set(null);
    this.selectedPracticeId.set('');
    this.selectedPermissionIds.set([]);
  }

  protected async saveAssignment(): Promise<void> {
    const current = this.reception();
    if (!current || this.isSubmitting() || !this.canManageAssignments) return;
    const editingId = this.editingAssignmentId();
    const editing = current.assignments.find((item) => item.id === editingId);
    let validationKey: string | null = null;
    if (editingId && (!editing || !editing.rowVersion)) {
      validationKey = 'receptions.assignmentStale';
    } else if (
      !editingId &&
      !this.practices().some((item) => item.id === this.selectedPracticeId())
    ) {
      validationKey = 'receptions.choosePractice';
    } else if (
      !editingId &&
      current.assignments.some((item) => item.doctorPracticeId === this.selectedPracticeId())
    ) {
      validationKey = 'receptions.assignmentDuplicate';
    }
    if (validationKey) {
      this.messages.set([validationKey]);
      this.toast.error(validationKey);
      return;
    }
    if (!this.hasSelectedPermissions()) {
      const message = this.langService.t(
        this.permissionOptions().length
          ? 'receptions.choosePermission'
          : 'receptions.permissionsUnavailable',
      );
      this.messages.set([message]);
      this.toast.error(message);
      return;
    }
    if (!this.editingAssignmentId() && !this.selectedPracticeId()) {
      const message = this.langService.t('receptions.choosePractice');
      this.messages.set([message]);
      this.toast.error(message);
      return;
    }
    this.isSubmitting.set(true);
    this.messages.set([]);
    try {
      if (editing) {
        await firstValueFrom(
          this.api.updateAssignment(current.id, editing.id, {
            permissionIds: this.selectedPermissionIds(),
            rowVersion: editing.rowVersion,
          }),
        );
      } else {
        await firstValueFrom(
          this.api.assign(current.id, {
            doctorPracticeId: this.selectedPracticeId(),
            permissionIds: this.selectedPermissionIds(),
          }),
        );
      }
      await this.loadDetails(current.id);
      this.cancelAssignmentEdit();
      this.toast.success(
        editing ? this.langService.t('ui.full.598') : this.langService.t('ui.full.599'),
      );
    } catch (error) {
      this.setErrors(error);
      if (error instanceof HttpErrorResponse && error.status === 409) {
        try {
          await this.loadDetails(current.id);
          const refreshed = this.reception()?.assignments.find((item) => item.id === editingId);
          if (editingId) {
            if (refreshed) this.editAssignment(refreshed);
            else this.cancelAssignmentEdit();
          }
        } catch (refreshError) {
          this.setErrors(refreshError);
        }
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async toggleAssignment(assignment: DoctorReceptionAssignment): Promise<void> {
    const current = this.reception();
    if (!current || this.isSubmitting() || !this.canManageAssignments) return;
    if (assignment.isActive && !window.confirm(this.langService.t('ui.full.600'))) {
      return;
    }
    this.isSubmitting.set(true);
    try {
      const request = { rowVersion: assignment.rowVersion };
      if (assignment.isActive) {
        await firstValueFrom(this.api.deactivateAssignment(current.id, assignment.id, request));
      } else {
        await firstValueFrom(this.api.activateAssignment(current.id, assignment.id, request));
      }
      await this.loadDetails(current.id);
      this.toast.success(
        assignment.isActive ? this.langService.t('ui.full.601') : this.langService.t('ui.full.602'),
      );
    } catch (error) {
      this.setErrors(error);
      if (error instanceof HttpErrorResponse && (error.status === 404 || error.status === 409)) {
        await this.loadDetails(current.id);
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected getPermissionLabel(code: string): string {
    const labels: Record<string, string> = {
      'DoctorReception.Queue.Call': this.langService.t('ui.full.603'),
      'DoctorReception.Queue.CheckIn': this.langService.t('ui.full.604'),
      'DoctorReception.Bookings.Manage': this.langService.t('ui.full.605'),
      'DoctorReception.Patients.View': this.langService.t('ui.full.606'),
      'DoctorReception.Queue.View': this.langService.t('ui.full.607'),
      'Patients.Register': this.langService.t('permissions.patientsRegister'),
      'Patients.SearchBasic': this.langService.t('permissions.patientsSearchBasic'),
      'PracticePayments.Record': this.langService.t('permissions.practicePaymentsRecord'),
      'PracticeQueue.Manage': this.langService.t('permissions.practiceQueueManage'),
      'PracticeReservations.Cancel': this.langService.t('permissions.practiceReservationsCancel'),
      'PracticeReservations.Create': this.langService.t('permissions.practiceReservationsCreate'),
      'PracticeReservations.Reschedule': this.langService.t(
        'permissions.practiceReservationsReschedule',
      ),
      'PracticeReservations.RestoreNoShow': this.langService.t(
        'permissions.practiceReservationsRestoreNoShow',
      ),
      'PracticeReservations.View': this.langService.t('permissions.practiceReservationsView'),
      'PracticeWalkIns.Create': this.langService.t('permissions.practiceWalkInsCreate'),
      'PracticeReservations.Manage': this.langService.t('permissions.practiceReservationsManage'),
    };
    return labels[code] || code;
  }

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      if (this.receptionId) {
        await this.loadDetails(this.receptionId);
      } else {
        this.receptions.set(await firstValueFrom(this.api.list()));
      }
      if (this.canManageAssignments) {
        const [practices] = await Promise.all([
          firstValueFrom(this.practicesApi.list()),
          this.loadPermissions(),
        ]);
        this.practices.set(practices);
      }
    } catch (error) {
      this.setErrors(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadDetails(id: string): Promise<void> {
    this.reception.set(await firstValueFrom(this.api.details(id)));
  }

  private async loadPermissions(): Promise<void> {
    try {
      this.availablePermissions.set(await firstValueFrom(this.api.listPermissions()));
    } catch {
      this.availablePermissions.set([]);
      this.messages.set(['receptions.permissionsUnavailable']);
      this.toast.error('receptions.permissionsUnavailable');
    }
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
