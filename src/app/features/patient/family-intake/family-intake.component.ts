import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  OnDestroy,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ChildIntake,
  ChildOnboardingReview,
  FamilyCandidateSearchResponse,
  FamilyEvidence,
  FamilyGovernanceDetails,
  FamilyInvitation,
  FamilyWorkspaceApi,
  ParentRole,
  FamiliesApi,
  FamilyRequestDetails,
} from '../../../domains/families';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { createIdempotencyKey } from '../../../core/http/create-idempotency-key';
import {
  getEvidenceFileValidationError,
  EVIDENCE_FILE_ACCEPT,
} from '../../../core/validation/evidence-files';

export type FamilyIntakeMode =
  | 'search'
  | 'onboard'
  | 'redeem'
  | 'invite'
  | 'identity'
  | 'resubmit'
  | 'conflict'
  | 'relationship';
@Component({
  selector: 'app-family-intake',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './family-intake.component.html',
  styleUrl: './family-intake.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyIntakeComponent implements OnChanges, OnDestroy {
  readonly mode = input<FamilyIntakeMode>('search');
  readonly childId = input('');
  readonly revision = input<ChildOnboardingReview | null>(null);
  readonly conflict = input<FamilyGovernanceDetails | null>(null);
  readonly relationship = input<FamilyRequestDetails | null>(null);
  readonly saved = output<void>();
  readonly invalidated = output<void>();
  readonly busyChanged = output<boolean>();
  readonly language = inject(LanguageService);
  private readonly api = inject(FamilyWorkspaceApi);
  private readonly relationships = inject(FamiliesApi);
  private readonly toast = inject(ToastService);
  readonly candidates = signal<FamilyCandidateSearchResponse | null>(null);
  readonly invitation = signal<FamilyInvitation | null>(null);
  readonly busy = signal(false);
  readonly accept = EVIDENCE_FILE_ACCEPT;
  readonly evidenceTypes = [
    'BirthCertificate',
    'RequesterNationalIdFront',
    'RequesterNationalIdBack',
    'TargetNationalIdFront',
    'TargetNationalIdBack',
    'GuardianshipDocument',
    'Other',
  ] as const;
  intake: ChildIntake = this.emptyIntake();
  files: File[] = [];
  documentTypes: string[] = [];
  candidateReference = '';
  invitationReference = '';
  intendedParentRole: ParentRole = 'Mother';
  reason = '';
  private sequence = 0;
  private intent: { signature: string; key: string } | null = null;
  ngOnChanges(): void {
    this.sequence++;
    this.busy.set(false);
    this.candidates.set(null);
    this.invitation.set(null);
    this.candidateReference = '';
    this.invitationReference = '';
    this.reason = '';
    this.intake = { ...(this.revision()?.intake ?? this.emptyIntake()) };
    this.files = [];
    this.documentTypes = [];
    this.intent = null;
  }
  ngOnDestroy(): void {
    this.sequence++;
  }
  async search(): Promise<void> {
    if (this.busy() || !this.intake.nameAr.trim() || !this.intake.dateOfBirth) return;
    this.candidateReference = '';
    this.candidates.set(null);
    this.setBusy(true);
    const sequence = this.sequence;
    try {
      const result = await firstValueFrom(
        this.api.search({
          nameAr: this.intake.nameAr.trim(),
          dateOfBirth: this.intake.dateOfBirth,
          gender: this.intake.gender,
          phoneNumber: this.intake.phoneNumber?.trim() || null,
        }),
      );
      if (sequence === this.sequence) {
        this.candidates.set(result);
      }
    } catch (error) {
      if (sequence === this.sequence) this.fail(error);
    } finally {
      if (sequence === this.sequence) this.setBusy(false);
    }
  }
  chooseFiles(event: Event): void {
    this.files = Array.from((event.target as HTMLInputElement).files ?? []);
    this.documentTypes = this.files.map(() => 'BirthCertificate');
  }
  async submit(): Promise<void> {
    if (this.busy()) return;
    if (this.mode() !== 'invite') {
      const error = getEvidenceFileValidationError(this.files, this.language.currentLang());
      if (
        !this.files.length ||
        this.files.length > 5 ||
        this.files.some((file) => !file.size || file.size > 10485760) ||
        error ||
        this.files.length !== this.documentTypes.length
      ) {
        this.toast.error(error || this.language.t('familyFlow.evidenceRequired'));
        return;
      }
    }
    if (
      ['onboard', 'resubmit'].includes(this.mode()) &&
      !this.intake.phoneNumber?.trim() &&
      (!this.intake.primaryContactNameAr?.trim() || !this.intake.primaryContactPhone?.trim())
    ) {
      this.toast.error(this.language.t('familyFlow.contactRequired'));
      return;
    }
    if (this.mode() === 'search' && !this.candidateReference) return;
    if (this.mode() === 'identity' && !this.reason.trim()) return;
    const evidence: FamilyEvidence = {
      evidenceFiles: this.files,
      documentTypes: this.documentTypes,
    };
    const signature = JSON.stringify([
      this.mode(),
      this.intake,
      this.childId(),
      this.candidateReference,
      this.invitationReference,
      this.intendedParentRole,
      this.reason,
      this.revision()?.request.rowVersion,
      this.conflict()?.request.rowVersion,
      this.files.map((file) => [file.name, file.size, file.lastModified]),
      this.documentTypes,
    ]);
    if (this.intent?.signature !== signature)
      this.intent = { signature, key: createIdempotencyKey() };
    const key = this.intent.key;
    const sequence = this.sequence;
    this.setBusy(true);
    try {
      switch (this.mode()) {
        case 'search':
          await firstValueFrom(
            this.api.submitCandidate(
              this.candidateReference,
              this.intake.relationToChild,
              evidence,
              key,
            ),
          );
          break;
        case 'onboard':
          await firstValueFrom(this.api.onboard(this.intake, evidence, key));
          break;
        case 'resubmit': {
          const revision = this.revision();
          if (!revision?.request.canResubmit) return;
          await firstValueFrom(
            this.api.resubmitOnboarding(
              revision.request.requestId,
              revision.request.rowVersion,
              evidence,
              key,
              this.intake,
            ),
          );
          break;
        }
        case 'conflict': {
          const conflict = this.conflict();
          if (!conflict || conflict.request.status !== 'ModificationRequested') return;
          await firstValueFrom(
            this.api.resubmitConflict(
              conflict.request.caseId,
              conflict.request.rowVersion,
              evidence,
              key,
            ),
          );
          break;
        }
        case 'relationship': {
          const request = this.relationship();
          if (!request || request.status !== 'ModificationRequested') return;
          await firstValueFrom(
            this.relationships.resubmit(request.requestId, {
              evidenceFiles: [...evidence.evidenceFiles],
              documentTypes: [...evidence.documentTypes],
              rowVersion: request.rowVersion,
            }),
          );
          break;
        }
        case 'identity':
          await firstValueFrom(
            this.api.requestIdentityCorrection(
              this.childId(),
              this.intake,
              this.reason.trim(),
              evidence,
              key,
            ),
          );
          break;
        case 'redeem':
          await firstValueFrom(
            this.api.redeemInvitation(
              this.invitationReference.trim(),
              this.intendedParentRole,
              evidence,
              key,
            ),
          );
          break;
        case 'invite': {
          const invitation = await firstValueFrom(
            this.api.invite(this.childId(), this.intendedParentRole, key),
          );
          if (sequence === this.sequence) this.invitation.set(invitation);
          break;
        }
      }
      if (sequence === this.sequence) {
        this.toast.success(
          this.language.t(this.mode() === 'invite' ? 'familyFlow.invited' : 'familyFlow.submitted'),
        );
        this.intent = null;
        if (this.mode() !== 'invite') this.saved.emit();
      }
    } catch (error) {
      if (sequence === this.sequence) this.fail(error);
    } finally {
      if (sequence === this.sequence) this.setBusy(false);
    }
  }
  async revokeInvitation(): Promise<void> {
    const invitation = this.invitation();
    if (!invitation || this.busy()) return;
    const signature = JSON.stringify(['revoke', invitation.invitationReference]);
    if (this.intent?.signature !== signature)
      this.intent = { signature, key: createIdempotencyKey() };
    this.setBusy(true);
    const sequence = this.sequence;
    try {
      await firstValueFrom(
        this.api.revokeInvitation(invitation.invitationReference, this.intent.key),
      );
      if (sequence === this.sequence) {
        this.invitation.set(null);
        this.toast.success(this.language.t('familyFlow.revoked'));
        this.saved.emit();
      }
    } catch (error) {
      if (sequence === this.sequence) this.fail(error);
    } finally {
      if (sequence === this.sequence) this.setBusy(false);
    }
  }
  private setBusy(value: boolean): void {
    this.busy.set(value);
    this.busyChanged.emit(value);
  }
  private fail(error: unknown): void {
    this.toast.error(
      this.language.t(
        error instanceof HttpErrorResponse && error.status === 429
          ? 'familyFlow.rateLimit'
          : error instanceof HttpErrorResponse && error.status === 409
            ? 'familyFlow.conflict'
            : 'familyFlow.failed',
      ),
    );
    if (error instanceof HttpErrorResponse && [401, 403, 404].includes(error.status)) {
      this.candidates.set(null);
      this.invitation.set(null);
      this.invalidated.emit();
    }
    if (error instanceof HttpErrorResponse && error.status === 409) this.invalidated.emit();
  }
  private emptyIntake(): ChildIntake {
    return {
      nameAr: '',
      nameEn: null,
      dateOfBirth: '',
      gender: 'Male',
      phoneNumber: null,
      primaryContactNameAr: null,
      primaryContactPhone: null,
      relationToChild: 'Father',
    };
  }
}
