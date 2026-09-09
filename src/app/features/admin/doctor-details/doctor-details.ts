import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ParsedApiErrors, parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { AdminDoctorsApi } from '../../../core/admin-doctors/admin-doctors-api';
import {
  AdminDoctorDetails,
  DoctorLifecycleResponse,
  DoctorMediaType,
} from '../../../core/admin-doctors/admin-doctors.models';
import { DoctorApprovalStatus } from '../../../core/doctors/doctor.models';
import {
  DoctorDecisionAction,
  DoctorDecisionDialog,
} from '../doctor-decision-dialog/doctor-decision-dialog';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog';

type DoctorLifecycleAction = DoctorDecisionAction | 'reactivate';

interface MediaDocument {
  type: DoctorMediaType;
  label: string;
  available: boolean;
}

interface MediaRequestState {
  loading: boolean;
  error: string;
}

interface MediaPreview {
  url: string;
  contentType: string;
  filename: string;
  label: string;
  isImage: boolean;
}

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-doctor-details',
  imports: [RouterLink, DoctorDecisionDialog, ConfirmationDialog],
  templateUrl: './doctor-details.html',
  styleUrl: './doctor-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorDetails {
  private readonly api = inject(AdminDoctorsApi);
  private readonly session = inject(AuthSession);
  private readonly doctorId = inject(ActivatedRoute).snapshot.paramMap.get('doctorId') ?? '';
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  protected readonly details = signal<AdminDoctorDetails | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly mediaStates = signal<Partial<Record<DoctorMediaType, MediaRequestState>>>({});
  protected readonly activeMedia = signal<MediaPreview | null>(null);
  protected readonly isActionSubmitting = signal(false);
  protected readonly actionMessages = signal<string[]>([]);
  protected readonly actionFieldError = signal('');
  protected readonly approveDialogOpen = signal(false);
  protected readonly rejectDialogOpen = signal(false);
  protected readonly suspendDialogOpen = signal(false);
  protected readonly reactivateDialogOpen = signal(false);
  protected readonly canApprove = computed(
    () =>
      this.details()?.approvalStatus === 'Pending' &&
      this.session.hasPermission(PERMISSIONS.doctorsApprove),
  );
  protected readonly canReject = computed(
    () =>
      this.details()?.approvalStatus === 'Pending' &&
      this.session.hasPermission(PERMISSIONS.doctorsReject),
  );
  protected readonly canSuspend = computed(
    () =>
      this.details()?.approvalStatus === 'Approved' &&
      this.session.hasPermission(PERMISSIONS.doctorsSuspend),
  );
  protected readonly canReactivate = computed(
    () =>
      this.details()?.approvalStatus === 'Suspended' &&
      this.session.hasPermission(PERMISSIONS.doctorsReactivate),
  );
  protected readonly documents = computed<MediaDocument[]>(() => {
    const doctor = this.details();
    if (!doctor) return [];
    return [
      { type: 'ProfileImage', label: 'صورة الملف الشخصي', available: doctor.hasProfileImage },
      {
        type: 'PersonalIdFront',
        label: 'الوجه الأمامي للهوية',
        available: doctor.hasPersonalIdFront,
      },
      {
        type: 'PersonalIdBack',
        label: 'الوجه الخلفي للهوية',
        available: doctor.hasPersonalIdBack,
      },
      {
        type: 'SyndicateCardFront',
        label: 'الوجه الأمامي لبطاقة النقابة',
        available: doctor.hasSyndicateFront,
      },
      {
        type: 'SyndicateCardBack',
        label: 'الوجه الخلفي لبطاقة النقابة',
        available: doctor.hasSyndicateBack,
      },
    ];
  });

  protected readonly doctorInitials = computed(() => {
    const name = this.details()?.nameAr ?? '';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return words[0][0] + words[1][0];
    return words[0]?.[0] ?? '؟';
  });

  protected readonly documentsAvailableCount = computed(
    () => this.documents().filter((d) => d.available).length,
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revokeActiveMedia());
    if (!GUID_PATTERN.test(this.doctorId)) {
      this.isLoading.set(false);
      this.apiMessages.set(['معرّف الطبيب غير صالح. ارجع إلى قائمة الأطباء واختر الطبيب من جديد.']);
      return;
    }
    void this.load();
  }

  protected async load(): Promise<void> {
    if (!GUID_PATTERN.test(this.doctorId)) return;
    this.isLoading.set(true);
    this.apiMessages.set([]);
    try {
      this.details.set(await firstValueFrom(this.api.details(this.doctorId)));
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.apiMessages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected openDecision(action: DoctorDecisionAction): void {
    this.clearActionErrors();
    this.decisionDialog(action).set(true);
  }

  protected openReactivate(): void {
    this.clearActionErrors();
    this.reactivateDialogOpen.set(true);
  }

  protected async approve(nationalId: string): Promise<void> {
    const doctor = this.details();
    if (!doctor || !this.canApprove() || this.isLoading() || this.isActionSubmitting()) return;
    await this.runLifecycle('approve', nationalId, () =>
      this.api.approve(doctor.doctorId, { nationalId, rowVersion: doctor.rowVersion }),
    );
  }

  protected async reject(reason: string): Promise<void> {
    const doctor = this.details();
    if (!doctor || !this.canReject() || this.isLoading() || this.isActionSubmitting()) return;
    await this.runLifecycle('reject', reason, () =>
      this.api.reject(doctor.doctorId, { reason, rowVersion: doctor.rowVersion }),
    );
  }

  protected async suspend(reason: string): Promise<void> {
    const doctor = this.details();
    if (!doctor || !this.canSuspend() || this.isLoading() || this.isActionSubmitting()) return;
    await this.runLifecycle('suspend', reason, () =>
      this.api.suspend(doctor.doctorId, { reason, rowVersion: doctor.rowVersion }),
    );
  }

  protected async reactivate(): Promise<void> {
    const doctor = this.details();
    if (!doctor || !this.canReactivate() || this.isLoading() || this.isActionSubmitting()) return;
    await this.runLifecycle('reactivate', '', () =>
      this.api.reactivate(doctor.doctorId, { rowVersion: doctor.rowVersion }),
    );
  }

  protected async openMedia(document: MediaDocument): Promise<void> {
    if (!document.available || this.mediaState(document.type).loading) return;
    this.setMediaState(document.type, { loading: true, error: '' });
    try {
      const response = await firstValueFrom(this.api.media(this.doctorId, document.type));
      const blob = response.body;
      if (!blob || blob.size === 0) throw new Error('Empty media response');
      this.revokeActiveMedia();
      this.activeMedia.set({
        url: URL.createObjectURL(blob),
        contentType:
          blob.type || response.headers.get('Content-Type') || 'application/octet-stream',
        filename: this.responseFilename(
          response.headers.get('Content-Disposition'),
          document.label,
        ),
        label: document.label,
        isImage: (blob.type || response.headers.get('Content-Type') || '').startsWith('image/'),
      });
      this.mediaDialogElement()?.showModal();
    } catch (error) {
      const messages = await this.mediaErrorMessages(error);
      this.setMediaState(document.type, { loading: false, error: messages.join(' ') });
      return;
    }
    this.setMediaState(document.type, { loading: false, error: '' });
  }

  protected closeMedia(event?: Event): void {
    event?.preventDefault();
    const dialog = this.mediaDialogElement();
    if (dialog?.open) dialog.close();
    this.revokeActiveMedia();
  }

  protected mediaState(type: DoctorMediaType): MediaRequestState {
    return this.mediaStates()[type] ?? { loading: false, error: '' };
  }

  protected statusLabel(status: DoctorApprovalStatus): string {
    return (
      {
        Pending: 'قيد المراجعة',
        Approved: 'معتمد',
        Rejected: 'مرفوض',
        Suspended: 'معلّق',
      } as const
    )[status];
  }

  protected statusClass(status: DoctorApprovalStatus): string {
    return `doctor-status ${status.toLowerCase()}`;
  }

  protected genderLabel(gender: string): string {
    return gender === 'Male' ? 'ذكر' : gender === 'Female' ? 'أنثى' : gender;
  }

  protected formatDate(value: string | null): string {
    if (!value) return 'غير مسجل';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en' : 'ar-EG', {
          dateStyle: 'medium',
        }).format(date);
  }

  protected clearActionErrors(): void {
    this.actionMessages.set([]);
    this.actionFieldError.set('');
  }

  protected dismissDecision(action: DoctorDecisionAction): void {
    this.decisionDialog(action).set(false);
    this.clearActionErrors();
  }

  protected dismissReactivate(): void {
    this.reactivateDialogOpen.set(false);
    this.clearActionErrors();
  }

  private async runLifecycle(
    action: DoctorLifecycleAction,
    value: string,
    request: () => ReturnType<AdminDoctorsApi['approve']>,
  ): Promise<void> {
    this.isActionSubmitting.set(true);
    this.clearActionErrors();
    try {
      const response = await firstValueFrom(request());
      this.applyLifecycleResponse(response, action, value);
      this.isActionSubmitting.set(false);
      this.closeLifecycleDialog(action);
      await this.load();
    } catch (error) {
      const parsed = parseApiErrors(error);
      const field = action === 'approve' ? 'nationalid' : action === 'reactivate' ? '' : 'reason';
      this.actionFieldError.set(parsed.fields[field]?.[0] ?? '');
      this.actionMessages.set([
        ...parsed.messages,
        ...Object.entries(parsed.fields)
          .filter(([key]) => !field || key !== field)
          .flatMap(([, messages]) => messages),
      ]);
      if (this.isConcurrencyConflict(action, parsed)) {
        this.actionMessages.update((messages) => [
          ...messages,
          'تغيرت بيانات الطبيب منذ فتح الصفحة. تمت إعادة تحميل أحدث نسخة؛ راجعها قبل المحاولة مرة أخرى.',
        ]);
        await this.load();
      }
    } finally {
      this.isActionSubmitting.set(false);
    }
  }

  private applyLifecycleResponse(
    response: DoctorLifecycleResponse,
    action: DoctorLifecycleAction,
    value: string,
  ): void {
    this.details.update((doctor) =>
      doctor
        ? {
            ...doctor,
            approvalStatus: response.approvalStatus,
            rowVersion: response.rowVersion,
            nationalId: action === 'approve' ? value : doctor.nationalId,
            rejectionReason: action === 'reject' ? value : doctor.rejectionReason,
            suspensionReason:
              action === 'suspend'
                ? value
                : action === 'reactivate'
                  ? null
                  : doctor.suspensionReason,
          }
        : doctor,
    );
  }

  private isConcurrencyConflict(action: DoctorLifecycleAction, parsed: ParsedApiErrors): boolean {
    if (parsed.status !== 409) return false;
    if (action !== 'approve' || parsed.fields['rowversion']?.length) return true;
    const codes = parsed.codes.join(' ').toLowerCase();
    return ['concurr', 'rowversion', 'stale'].some((term) => codes.includes(term));
  }

  private decisionDialog(action: DoctorDecisionAction) {
    return {
      approve: this.approveDialogOpen,
      reject: this.rejectDialogOpen,
      suspend: this.suspendDialogOpen,
    }[action];
  }

  private closeLifecycleDialog(action: DoctorLifecycleAction): void {
    if (action === 'reactivate') this.reactivateDialogOpen.set(false);
    else this.decisionDialog(action).set(false);
  }

  private setMediaState(type: DoctorMediaType, state: MediaRequestState): void {
    this.mediaStates.update((states) => ({ ...states, [type]: state }));
  }

  private mediaDialogElement(): HTMLDialogElement | null {
    return this.host.nativeElement.querySelector('.media-dialog');
  }

  private revokeActiveMedia(): void {
    const media = this.activeMedia();
    if (media) URL.revokeObjectURL(media.url);
    this.activeMedia.set(null);
  }

  private responseFilename(contentDisposition: string | null, fallback: string): string {
    const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plain = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1];
    const value = encoded ?? plain;
    if (!value) return fallback;
    try {
      return decodeURIComponent(value.trim());
    } catch {
      return value.trim();
    }
  }

  private async mediaErrorMessages(error: unknown): Promise<string[]> {
    if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
      try {
        const payload: unknown = JSON.parse(await error.error.text());
        const parsed = parseApiErrors(
          new HttpErrorResponse({
            error: payload,
            headers: error.headers,
            status: error.status,
            statusText: error.statusText,
            url: error.url ?? undefined,
          }),
        );
        return [...parsed.messages, ...Object.values(parsed.fields).flat()];
      } catch {
        return parseApiErrors(error).messages;
      }
    }
    const parsed = parseApiErrors(error);
    return [...parsed.messages, ...Object.values(parsed.fields).flat()];
  }
}
