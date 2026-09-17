import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
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
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { ToastService } from '../../../core/notifications/toast.service';
import { DoctorSpecializationRequestsApi } from '../services/doctor-specialization-requests';
import { DoctorSpecializationRequestDetails } from '../services/doctor-specialization-requests';
import {
  DoctorSpecializationHistoryItem,
  DoctorSpecializationSelection,
  MedicalSpecializationOption,
} from '../../../domains/doctor-profile';
import { MedicalSpecializationsApi } from '../services/medical-specializations';
import { SpecializationSelector } from '../../../domains/doctor-profile';

type ReviewAction = 'adjust' | 'modification' | 'approve' | 'reject';

@Component({
  selector: 'app-specialization-request-details',
  imports: [FormField, RouterLink, SpecializationSelector, TranslatePipe],
  templateUrl: './specialization-request-details.html',
  styleUrl: './specialization-request-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecializationRequestDetailsPage {
  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(DoctorSpecializationRequestsApi);
  private readonly catalogApi = inject(MedicalSpecializationsApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly routeId = this.route?.snapshot.paramMap.get('requestId') ?? null;

  readonly requestIdInput = input<string | null>(null);
  readonly isDrawer = input<boolean>(false);
  readonly closed = output<void>();
  readonly reviewed = output<void>();

  protected readonly activeId = computed(() => this.requestIdInput() || this.routeId);
  protected readonly details = signal<DoctorSpecializationRequestDetails | null>(null);
  protected readonly history = signal<DoctorSpecializationHistoryItem[]>([]);
  protected readonly options = signal<MedicalSpecializationOption[]>([]);
  protected readonly selected = signal<DoctorSpecializationSelection[]>([]);
  protected readonly action = signal<ReviewAction | null>(null);
  protected readonly textModel = signal({ text: '' });
  protected readonly textForm = form(this.textModel, (field) => {
    required(field.text, { message: 'ui.full.96' });
    maxLength(field.text, 2000, { message: 'validation.max2000' });
  });
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly isPending = computed(() => this.details()?.request.status === 'PendingReview');

  private loadedId = '';

  constructor() {
    effect(() => {
      const id = this.activeId();
      untracked(() => {
        if (!id) {
          this.loadedId = '';
          this.details.set(null);
          this.history.set([]);
          this.selected.set([]);
          return;
        }
        if (id === this.loadedId) return;
        this.loadedId = id;
        void this.load(id);
      });
    });
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
      if (confirm(this.uiLanguage.t('ui.full.97'))) void this.execute(action);
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
        adjust: this.uiLanguage.t('ui.full.98'),
        modification: this.uiLanguage.t('ui.full.99'),
        reject: this.uiLanguage.t('ui.full.100'),
        approve: '',
      }[action];
      if (message && !confirm(message)) return;
      await this.execute(action);
    });
  }

  protected async load(id?: string): Promise<void> {
    const targetId = id || this.activeId();
    if (!targetId) return;
    this.isLoading.set(true);
    this.apiMessages.set([]);
    try {
      const details = await firstValueFrom(this.api.details(targetId));
      this.details.set(details);
      this.selected.set(
        details.request.latestRevision.map(({ medicalSpecializationId, isPrimary }) => ({
          medicalSpecializationId,
          isPrimary,
        })),
      );
      const tasks: Promise<void>[] = [this.loadHistory(targetId)];
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
      : new Intl.DateTimeFormat(this.uiLanguage.currentLang() === 'en' ? 'en' : 'ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  protected doctorInitials(nameAr: string): string {
    if (!nameAr) return this.uiLanguage.t('common.doctorInitial');
    const clean = nameAr.replace(/^(دكتور|د\.|أ\.د|أستاذ دكتور)\s+/i, '').trim();
    const parts = clean.split(/\s+/);
    if (!parts.length || !parts[0]) return this.uiLanguage.t('common.doctorInitial');
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0][0]}${parts[1][0]}`;
  }

  private async execute(action: ReviewAction): Promise<void> {
    const targetId = this.activeId();
    const details = this.details();
    if (!targetId || !details || !this.can(action) || this.isSubmitting()) return;
    if (
      action === 'adjust' &&
      (!this.selected().length || this.selected().filter((x) => x.isPrimary).length !== 1)
    ) {
      this.apiMessages.set([this.uiLanguage.t('doctor.specializationsInvalid')]);
      return;
    }
    this.isSubmitting.set(true);
    this.apiMessages.set([]);
    const rowVersion = details.request.rowVersion;
    const text = this.textModel().text.trim();
    try {
      if (action === 'adjust') {
        await firstValueFrom(
          this.api.adjust(targetId, {
            specializations: this.selected(),
            reason: text,
            rowVersion,
          }),
        );
        this.toast.success(this.uiLanguage.t('ui.full.101'));
      } else if (action === 'modification') {
        await firstValueFrom(
          this.api.requestModification(targetId, { message: text, rowVersion }),
        );
        this.toast.success(this.uiLanguage.t('ui.full.102'));
      } else if (action === 'approve') {
        await firstValueFrom(this.api.approve(targetId, { rowVersion }));
        this.toast.success(this.uiLanguage.t('ui.full.103'));
      } else {
        await firstValueFrom(this.api.reject(targetId, { reason: text, rowVersion }));
        this.toast.success(this.uiLanguage.t('ui.full.104'));
      }
      this.action.set(null);
      await this.load(targetId);
      this.reviewed.emit();
    } catch (error) {
      this.handleError(error);
      if (error instanceof HttpErrorResponse && error.status === 409) await this.load(targetId);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async loadHistory(requestId: string): Promise<void> {
    this.history.set(await firstValueFrom(this.api.history(requestId)));
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
