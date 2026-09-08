import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { DoctorSpecializationRequestsApi } from '../../../core/doctor-specialization-requests/doctor-specialization-requests-api';
import { DoctorSpecializationRequestDetails } from '../../../core/doctor-specialization-requests/doctor-specialization-requests.models';
import {
  DoctorSpecializationHistoryItem,
  DoctorSpecializationSelection,
  MedicalSpecializationOption,
} from '../../../core/doctor-profile/doctor-profile.models';
import { MedicalSpecializationsApi } from '../../../core/medical-specializations/medical-specializations-api';
import { SpecializationSelector } from '../../../shared/specialization-selector/specialization-selector';

type ReviewAction = 'adjust' | 'modification' | 'approve' | 'reject';

@Component({
  selector: 'app-specialization-request-details',
  imports: [FormField, RouterLink, SpecializationSelector],
  templateUrl: './specialization-request-details.html',
  styleUrl: './specialization-request-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecializationRequestDetailsPage {
  private readonly api = inject(DoctorSpecializationRequestsApi);
  private readonly catalogApi = inject(MedicalSpecializationsApi);
  private readonly session = inject(AuthSession);
  private readonly requestId = inject(ActivatedRoute).snapshot.paramMap.get('requestId')!;

  protected readonly details = signal<DoctorSpecializationRequestDetails | null>(null);
  protected readonly history = signal<DoctorSpecializationHistoryItem[]>([]);
  protected readonly options = signal<MedicalSpecializationOption[]>([]);
  protected readonly selected = signal<DoctorSpecializationSelection[]>([]);
  protected readonly action = signal<ReviewAction | null>(null);
  protected readonly textModel = signal({ text: '' });
  protected readonly textForm = form(this.textModel, (field) => {
    required(field.text, { message: 'السبب أو الرسالة مطلوبة.' });
    maxLength(field.text, 2000, { message: 'الحد الأقصى 2000 حرف.' });
  });
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly isPending = computed(() => this.details()?.request.status === 'PendingReview');

  constructor() {
    void this.load();
  }

  protected can(action: ReviewAction): boolean {
    if (!this.isPending()) return false;
    return this.session.hasPermission(
      {
        adjust: PERMISSIONS.doctorSpecializationRequestsAdjust,
        modification: PERMISSIONS.doctorSpecializationRequestsRequestModification,
        approve: PERMISSIONS.doctorSpecializationRequestsApprove,
        reject: PERMISSIONS.doctorSpecializationRequestsReject,
      }[action],
    );
  }

  protected openAction(action: ReviewAction): void {
    if (!this.can(action)) return;
    if (action === 'approve') {
      if (confirm('اعتماد أحدث مقترح واستبدال التخصصات الفعالة للطبيب؟')) void this.execute(action);
      return;
    }
    this.textModel.set({ text: '' });
    this.textForm().reset();
    this.action.set(action);
  }

  protected closeAction(): void {
    if (!this.isSubmitting()) this.action.set(null);
  }

  protected async submitAction(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.textForm, async () => {
      const action = this.action();
      if (!action) return;
      const message = {
        adjust: 'تأكيد إنشاء مراجعة جديدة للمقترح مع بقاء الطلب قيد المراجعة؟',
        modification: 'تأكيد إرسال طلب التعديل إلى الطبيب؟',
        reject: 'تأكيد رفض الطلب مع الحفاظ على التخصصات الفعالة الحالية؟',
        approve: '',
      }[action];
      if (message && !confirm(message)) return;
      await this.execute(action);
    });
  }

  protected async load(): Promise<void> {
    this.isLoading.set(true);
    this.apiMessages.set([]);
    try {
      const details = await firstValueFrom(this.api.details(this.requestId));
      this.details.set(details);
      this.selected.set(
        details.request.latestRevision.map(({ medicalSpecializationId, isPrimary }) => ({
          medicalSpecializationId,
          isPrimary,
        })),
      );
      const tasks: Promise<void>[] = [this.loadHistory()];
      if (this.can('adjust')) tasks.push(this.loadCatalog());
      await Promise.all(tasks);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  private async execute(action: ReviewAction): Promise<void> {
    const details = this.details();
    if (!details || !this.can(action) || this.isSubmitting()) return;
    if (
      action === 'adjust' &&
      (!this.selected().length || this.selected().filter((x) => x.isPrimary).length !== 1)
    ) {
      this.apiMessages.set(['اختر تخصصًا واحدًا على الأقل وحدد تخصصًا أساسيًا واحدًا فقط.']);
      return;
    }
    this.isSubmitting.set(true);
    this.apiMessages.set([]);
    const rowVersion = details.request.rowVersion;
    const text = this.textModel().text.trim();
    try {
      if (action === 'adjust') {
        await firstValueFrom(
          this.api.adjust(this.requestId, {
            specializations: this.selected(),
            reason: text,
            rowVersion,
          }),
        );
      } else if (action === 'modification') {
        await firstValueFrom(
          this.api.requestModification(this.requestId, { message: text, rowVersion }),
        );
      } else if (action === 'approve') {
        await firstValueFrom(this.api.approve(this.requestId, { rowVersion }));
      } else {
        await firstValueFrom(this.api.reject(this.requestId, { reason: text, rowVersion }));
      }
      this.action.set(null);
      await this.load();
    } catch (error) {
      this.handleError(error);
      if (error instanceof HttpErrorResponse && error.status === 409) await this.load();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async loadHistory(): Promise<void> {
    this.history.set(await firstValueFrom(this.api.history(this.requestId)));
  }

  private async loadCatalog(): Promise<void> {
    const collected: MedicalSpecializationOption[] = [];
    let pageNumber = 1;
    let totalCount = 0;
    do {
      const page = await firstValueFrom(
        this.catalogApi.list({ isActive: true, isDeleted: false, pageNumber, pageSize: 100 }),
      );
      collected.push(...page.items.map(({ id, nameAr, nameEn }) => ({ id, nameAr, nameEn })));
      totalCount = page.totalCount;
      pageNumber += 1;
    } while (collected.length < totalCount);
    this.options.set(collected);
  }

  private handleError(error: unknown): void {
    const parsed = parseApiErrors(error);
    this.apiMessages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
  }
}
