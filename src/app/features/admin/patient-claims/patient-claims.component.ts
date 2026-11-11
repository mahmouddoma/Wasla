import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import {
  AdminClaimDetails,
  AdminPatientClaimSummaryItem,
  ClaimHistoryItem,
  PatientIdentityApi,
} from '../../../domains/patient-identity';
import { PageHeader } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-patient-claims',
  imports: [TranslatePipe, PageHeader],
  templateUrl: './patient-claims.component.html',
  styleUrl: './patient-claims.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientClaimsComponent {
  readonly uiLanguage = inject(LanguageService);
  private readonly api = inject(PatientIdentityApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  // === Permissions ===
  readonly canViewAll = computed(() =>
    this.session.hasPermission(PERMISSIONS.patientClaimsViewAll),
  );
  readonly canViewDetails = computed(() =>
    this.session.hasPermission(PERMISSIONS.patientClaimsViewDetails),
  );
  readonly canViewEvidence = computed(() =>
    this.session.hasPermission(PERMISSIONS.patientClaimsViewEvidence),
  );
  readonly canApprovePerm = computed(() =>
    this.session.hasPermission(PERMISSIONS.patientClaimsApprove),
  );
  readonly canRejectPerm = computed(() =>
    this.session.hasPermission(PERMISSIONS.patientClaimsReject),
  );
  readonly canRequestModPerm = computed(() =>
    this.session.hasPermission(PERMISSIONS.patientClaimsRequestModification),
  );

  // === List & Filters State ===
  readonly statusFilter = signal<string>('PendingReview');
  readonly emailSearch = signal<string>('');
  readonly pageNumber = signal<number>(1);
  readonly pageSize = signal<number>(20);
  readonly items = signal<readonly AdminPatientClaimSummaryItem[]>([]);
  readonly totalCount = signal<number>(0);
  readonly isLoadingList = signal<boolean>(true);
  readonly listError = signal<string>('');

  readonly totalPages = computed(() => {
    const total = this.totalCount();
    const size = this.pageSize() || 20;
    return Math.max(1, Math.ceil(total / size));
  });

  readonly hasActiveFilters = computed(
    () => !!this.emailSearch().trim() || !!this.statusFilter(),
  );

  readonly pendingReviewCount = computed(() =>
    this.statusFilter() === 'PendingReview'
      ? this.totalCount()
      : this.items().filter((i) => i.status === 'PendingReview').length,
  );

  readonly modificationRequestedCount = computed(() =>
    this.statusFilter() === 'ModificationRequested'
      ? this.totalCount()
      : this.items().filter((i) => i.status === 'ModificationRequested').length,
  );

  readonly approvedCount = computed(() =>
    this.statusFilter() === 'ApprovedPendingActivation'
      ? this.totalCount()
      : this.items().filter((i) => i.status === 'ApprovedPendingActivation' || i.status === 'Linked').length,
  );

  readonly rejectedCount = computed(() =>
    this.statusFilter() === 'Rejected'
      ? this.totalCount()
      : this.items().filter((i) => i.status === 'Rejected').length,
  );

  // === Drawer & Claim Review State ===
  readonly drawerOpen = signal<boolean>(false);
  readonly selectedClaimId = signal<string>('');
  readonly claimDetails = signal<AdminClaimDetails | null>(null);
  readonly claimHistory = signal<readonly ClaimHistoryItem[]>([]);
  readonly isLoadingDetails = signal<boolean>(false);
  readonly isSubmittingDecision = signal<boolean>(false);
  readonly drawerError = signal<string>('');

  readonly selectedTargetPatientId = signal<string>('');
  readonly reviewedEvidenceIds = signal<readonly string[]>([]);
  readonly reviewNote = signal<string>('');
  readonly decisionReason = signal<string>('');

  // === Secure Evidence Blob Preview State ===
  readonly previewEvidenceId = signal<string>('');
  readonly previewBlobUrl = signal<string>('');
  readonly previewContentType = signal<string>('');
  readonly isLoadingEvidence = signal<boolean>(false);

  readonly latestRevisionNumber = computed(() => {
    const ev = this.claimDetails()?.evidence ?? [];
    if (!ev.length) return 1;
    return Math.max(...ev.map((item) => item.revisionNumber || 1));
  });

  readonly canSubmitApprove = computed(() => {
    const details = this.claimDetails();
    if (!details || !details.reviewCapabilities.canApprove || !this.canApprovePerm()) return false;
    return (
      !!this.selectedTargetPatientId().trim() &&
      this.reviewedEvidenceIds().length > 0 &&
      !this.isSubmittingDecision()
    );
  });

  readonly canSubmitModOrReject = computed(() => {
    return !!this.decisionReason().trim() && !this.isSubmittingDecision();
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.revokeEvidencePreview());
    if (this.canViewAll()) {
      void this.loadClaims(1);
    }
  }

  async loadClaims(page = this.pageNumber()): Promise<void> {
    if (!this.canViewAll()) return;
    this.isLoadingList.set(true);
    this.listError.set('');
    this.pageNumber.set(page);
    try {
      const response = await firstValueFrom(
        this.api.adminClaims(
          this.statusFilter() || undefined,
          page,
          this.pageSize(),
          this.emailSearch().trim() || undefined,
        ),
      );
      this.items.set(response.items);
      this.totalCount.set(response.totalCount);
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.listError.set(parsed.messages[0] || 'common.requestFailed');
    } finally {
      this.isLoadingList.set(false);
    }
  }

  onStatusFilterChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
    void this.loadClaims(1);
  }

  setQuickFilter(status: string): void {
    this.statusFilter.set(status);
    void this.loadClaims(1);
  }

  clearSearch(): void {
    this.emailSearch.set('');
    void this.loadClaims(1);
  }

  clearAllFilters(): void {
    this.statusFilter.set('');
    this.emailSearch.set('');
    void this.loadClaims(1);
  }

  getStatusLabel(status: string): string {
    const key = `onboarding.status.${status}`;
    const translated = this.uiLanguage.t(key);
    return translated !== key ? translated : status;
  }

  loadDemoClaims(): void {
    this.isLoadingList.set(true);
    setTimeout(() => {
      this.items.set([
        {
          id: 'claim-demo-1',
          status: 'PendingReview',
          claimantEmailMasked: 'ahmed.k***@gmail.com',
          submittedOnUtc: '2026-11-10 14:30',
          lastActivityOnUtc: '2026-11-10 14:30',
          evidenceCount: 2,
          rowVersion: 'rv-demo-1',
        },
        {
          id: 'claim-demo-2',
          status: 'ModificationRequested',
          claimantEmailMasked: 'sara.m***@outlook.com',
          submittedOnUtc: '2026-11-09 11:15',
          lastActivityOnUtc: '2026-11-10 09:00',
          evidenceCount: 1,
          rowVersion: 'rv-demo-2',
        },
        {
          id: 'claim-demo-3',
          status: 'ApprovedPendingActivation',
          claimantEmailMasked: 'khaled.o***@yahoo.com',
          submittedOnUtc: '2026-11-08 18:45',
          lastActivityOnUtc: '2026-11-09 10:20',
          evidenceCount: 3,
          rowVersion: 'rv-demo-3',
        },
      ]);
      this.totalCount.set(3);
      this.statusFilter.set('');
      this.isLoadingList.set(false);
    }, 700);
  }

  onEmailSearchInput(event: Event): void {
    this.emailSearch.set((event.target as HTMLInputElement).value);
  }

  onSearchSubmit(event: Event): void {
    event.preventDefault();
    void this.loadClaims(1);
  }

  async openClaimDrawer(claimId: string): Promise<void> {
    if (!this.canViewDetails()) return;
    this.selectedClaimId.set(claimId);
    this.drawerOpen.set(true);
    this.resetDecisionInputs();
    await this.loadClaimDetails(claimId);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.selectedClaimId.set('');
    this.claimDetails.set(null);
    this.claimHistory.set([]);
    this.resetDecisionInputs();
    this.revokeEvidencePreview();
  }

  async loadClaimDetails(claimId: string): Promise<void> {
    this.isLoadingDetails.set(true);
    this.drawerError.set('');
    try {
      const details = await firstValueFrom(this.api.adminClaimDetails(claimId));
      this.claimDetails.set(details);
      if (details.candidatePatients.length === 1) {
        this.selectedTargetPatientId.set(details.candidatePatients[0].patientId);
      } else if (details.patientReference) {
        this.selectedTargetPatientId.set(details.patientReference);
      }
      try {
        const history = await firstValueFrom(this.api.claimHistory(claimId));
        this.claimHistory.set(history);
      } catch {
        this.claimHistory.set([]);
      }
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.drawerError.set(parsed.messages[0] || 'common.requestFailed');
    } finally {
      this.isLoadingDetails.set(false);
    }
  }

  selectCandidatePatient(patientId: string): void {
    this.selectedTargetPatientId.set(patientId);
  }

  onTargetPatientInput(event: Event): void {
    this.selectedTargetPatientId.set((event.target as HTMLInputElement).value.trim());
  }

  toggleReviewedEvidence(evidenceId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.reviewedEvidenceIds.update((current) =>
      checked
        ? current.includes(evidenceId)
          ? current
          : [...current, evidenceId]
        : current.filter((id) => id !== evidenceId),
    );
  }

  isEvidenceReviewed(evidenceId: string): boolean {
    return this.reviewedEvidenceIds().includes(evidenceId);
  }

  async previewEvidence(evidenceId: string): Promise<void> {
    const claimId = this.selectedClaimId();
    if (!claimId || !this.canViewEvidence()) return;
    this.revokeEvidencePreview();
    this.isLoadingEvidence.set(true);
    this.previewEvidenceId.set(evidenceId);
    try {
      const response = await firstValueFrom(this.api.adminClaimEvidence(claimId, evidenceId));
      const blob = response.body;
      if (blob && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        this.previewContentType.set(blob.type || 'image/jpeg');
        this.previewBlobUrl.set(URL.createObjectURL(blob));
      }
      if (!this.isEvidenceReviewed(evidenceId)) {
        this.reviewedEvidenceIds.update((list) => [...list, evidenceId]);
      }
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.toast.error(this.uiLanguage.t(parsed.messages[0] || 'common.requestFailed'));
    } finally {
      this.isLoadingEvidence.set(false);
    }
  }

  revokeEvidencePreview(): void {
    const currentUrl = this.previewBlobUrl();
    if (currentUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(currentUrl);
    }
    this.previewBlobUrl.set('');
    this.previewEvidenceId.set('');
    this.previewContentType.set('');
  }

  async approveClaim(): Promise<void> {
    const details = this.claimDetails();
    if (!details || !this.canSubmitApprove()) return;

    this.isSubmittingDecision.set(true);
    this.drawerError.set('');
    const idempotencyKey = this.generateUuid();
    try {
      const res = await firstValueFrom(
        this.api.approveClaim(
          details.claimRequestId,
          {
            targetPatientId: this.selectedTargetPatientId().trim(),
            rowVersion: details.rowVersion,
            reviewedEvidenceIds: this.reviewedEvidenceIds(),
            reviewNote: this.reviewNote().trim() || undefined,
          },
          idempotencyKey,
        ),
      );
      this.toast.success(this.uiLanguage.t('adminClaims.approvedToast'));
      this.claimDetails.update((prev) =>
        prev
          ? {
              ...prev,
              status: res.status,
              rowVersion: res.rowVersion,
              reviewCapabilities: {
                canApprove: false,
                canReject: false,
                canRequestModification: false,
              },
            }
          : null,
      );
      await this.loadClaims(this.pageNumber());
    } catch (error) {
      await this.handleDecisionError(error, details.claimRequestId);
    } finally {
      this.isSubmittingDecision.set(false);
    }
  }

  async requestModification(): Promise<void> {
    const details = this.claimDetails();
    if (
      !details ||
      !details.reviewCapabilities.canRequestModification ||
      !this.canRequestModPerm() ||
      !this.canSubmitModOrReject()
    )
      return;

    this.isSubmittingDecision.set(true);
    this.drawerError.set('');
    const idempotencyKey = this.generateUuid();
    try {
      const res = await firstValueFrom(
        this.api.requestClaimModification(
          details.claimRequestId,
          {
            rowVersion: details.rowVersion,
            reason: this.decisionReason().trim(),
          },
          idempotencyKey,
        ),
      );
      this.toast.success(this.uiLanguage.t('adminClaims.modificationRequestedToast'));
      this.claimDetails.update((prev) =>
        prev
          ? {
              ...prev,
              status: res.status,
              rowVersion: res.rowVersion,
              reviewCapabilities: {
                canApprove: false,
                canReject: false,
                canRequestModification: false,
              },
            }
          : null,
      );
      await this.loadClaims(this.pageNumber());
    } catch (error) {
      await this.handleDecisionError(error, details.claimRequestId);
    } finally {
      this.isSubmittingDecision.set(false);
    }
  }

  async rejectClaim(): Promise<void> {
    const details = this.claimDetails();
    if (
      !details ||
      !details.reviewCapabilities.canReject ||
      !this.canRejectPerm() ||
      !this.canSubmitModOrReject()
    )
      return;

    this.isSubmittingDecision.set(true);
    this.drawerError.set('');
    const idempotencyKey = this.generateUuid();
    try {
      const res = await firstValueFrom(
        this.api.rejectClaim(
          details.claimRequestId,
          {
            rowVersion: details.rowVersion,
            reason: this.decisionReason().trim(),
          },
          idempotencyKey,
        ),
      );
      this.toast.success(this.uiLanguage.t('adminClaims.rejectedToast'));
      this.claimDetails.update((prev) =>
        prev
          ? {
              ...prev,
              status: res.status,
              rowVersion: res.rowVersion,
              reviewCapabilities: {
                canApprove: false,
                canReject: false,
                canRequestModification: false,
              },
            }
          : null,
      );
      await this.loadClaims(this.pageNumber());
    } catch (error) {
      await this.handleDecisionError(error, details.claimRequestId);
    } finally {
      this.isSubmittingDecision.set(false);
    }
  }

  private async handleDecisionError(error: unknown, claimId: string): Promise<void> {
    const parsed = parseApiErrors(error);
    if (
      (error instanceof HttpErrorResponse && error.status === 409) ||
      parsed.codes.includes('PatientClaims.ConcurrencyConflict')
    ) {
      const msg = this.uiLanguage.t('onboarding.errors.concurrencyConflict');
      this.drawerError.set(msg);
      this.toast.error(msg);
      await this.loadClaimDetails(claimId);
      return;
    }
    const msg = this.uiLanguage.t(parsed.messages[0] || 'common.requestFailed');
    this.drawerError.set(msg);
    this.toast.error(msg);
  }

  private resetDecisionInputs(): void {
    this.selectedTargetPatientId.set('');
    this.reviewedEvidenceIds.set([]);
    this.reviewNote.set('');
    this.decisionReason.set('');
    this.drawerError.set('');
  }

  private generateUuid(): string {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

