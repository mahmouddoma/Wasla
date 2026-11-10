import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ChildOnboardingReview,
  FamilyGovernanceDetails,
  FamilyWorkspaceApi,
  OperationalAuthority,
} from '../../../domains/families';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { createIdempotencyKey } from '../../../core/http/create-idempotency-key';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';

type ReviewAction = 'approve' | 'reject' | 'request-modification' | 'refer-governance';

@Component({
  selector: 'app-family-review',
  imports: [DatePipe, FormsModule, NgTemplateOutlet, TranslatePipe, PageHeader, SideDrawer],
  templateUrl: './family-review.component.html',
  styleUrl: './family-review.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyReviewComponent implements OnDestroy {
  readonly language = inject(LanguageService);
  readonly session = inject(AuthSession);
  private readonly api = inject(FamilyWorkspaceApi);
  private readonly toast = inject(ToastService);

  readonly queue = signal<'onboarding' | 'governance'>(
    this.session.hasPermission('ChildOnboarding.ViewAll') ? 'onboarding' : 'governance',
  );
  readonly onboarding = signal<ChildOnboardingReview[]>([]);
  readonly governance = signal<FamilyGovernanceDetails[]>([]);
  readonly childReview = signal<ChildOnboardingReview | null>(null);
  readonly governanceReview = signal<FamilyGovernanceDetails | null>(null);
  readonly authorities = signal<OperationalAuthority[]>([]);
  readonly revoking = signal<OperationalAuthority | null>(null);
  readonly confirming = signal<ReviewAction | null>(null);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly page = signal(1);
  readonly total = signal(0);
  confirmedExistingPatientId = '';
  reason = '';
  readonly searchQuery = signal('');

  // Master-Detail detection
  private readonly resizeListener = () => {
    if (typeof window !== 'undefined') {
      this.isDesktop.set(window.innerWidth >= 1025);
    }
  };
  readonly isDesktop = signal(
    typeof window !== 'undefined' ? window.innerWidth >= 1025 : true,
  );

  readonly hasActiveDetail = computed(
    () => this.detailLoading() || !!this.childReview() || !!this.governanceReview(),
  );

  readonly selectedId = computed(() => {
    return this.childReview()?.request.requestId || this.governanceReview()?.request.caseId || null;
  });

  readonly detailTitle = computed(() => {
    if (this.childReview()) {
      return this.childReview()!.intake.nameAr || this.language.t('familyReview.title');
    }
    if (this.governanceReview()) {
      return this.language.t('familyFlow.kind.' + this.governanceReview()!.request.kind);
    }
    return this.language.t('familyReview.title');
  });

  readonly filteredOnboarding = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const items = this.onboarding();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.intake.nameAr?.toLowerCase().includes(q) ||
        item.intake.nameEn?.toLowerCase().includes(q) ||
        item.request.requestId?.toLowerCase().includes(q) ||
        item.intake.primaryContactNameAr?.toLowerCase().includes(q),
    );
  });

  readonly filteredGovernance = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const items = this.governance();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.request.caseId?.toLowerCase().includes(q) ||
        item.request.kind?.toLowerCase().includes(q) ||
        this.language.t('familyFlow.kind.' + item.request.kind).toLowerCase().includes(q),
    );
  });

  private sequence = 0;
  private detailSequence = 0;
  private intent: { signature: string; key: string } | null = null;
  private readonly urls = new Set<string>();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.resizeListener);
    }
    void this.load();
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeListener);
    }
    this.sequence++;
    this.close();
  }

  async selectQueue(queue: 'onboarding' | 'governance'): Promise<void> {
    this.queue.set(queue);
    this.searchQuery.set('');
    this.close();
    await this.load(1);
  }

  async load(page = this.page()): Promise<void> {
    const sequence = ++this.sequence;
    this.loading.set(true);
    this.failed.set(false);
    this.onboarding.set([]);
    this.governance.set([]);
    try {
      if (this.queue() === 'onboarding' && this.session.hasPermission('ChildOnboarding.ViewAll')) {
        const items = await firstValueFrom(this.api.adminOnboardingRequests(page));
        if (sequence === this.sequence) this.onboarding.set(items);
      } else if (
        this.queue() === 'governance' &&
        this.session.hasPermission('FamilyRelationshipRequests.ViewAll')
      ) {
        const result = await firstValueFrom(this.api.adminGovernanceCases(page));
        if (sequence === this.sequence) {
          this.governance.set(result.items);
          this.total.set(result.totalCount);
        }
      }
      if (sequence === this.sequence) this.page.set(page);
    } catch (error) {
      if (sequence === this.sequence) this.fail(error);
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }

  async inspectChild(id: string, matchPage = 1): Promise<void> {
    if (!this.session.hasPermission('ChildOnboarding.ViewDetails')) return;
    this.close();
    const sequence = this.detailSequence;
    this.detailLoading.set(true);
    try {
      const result = await firstValueFrom(this.api.adminOnboardingDetails(id, matchPage));
      if (sequence === this.detailSequence) this.childReview.set(result[0] ?? null);
    } catch (error) {
      if (sequence === this.detailSequence) this.fail(error);
    } finally {
      if (sequence === this.detailSequence) this.detailLoading.set(false);
    }
  }

  async inspectGovernance(id: string): Promise<void> {
    if (!this.session.hasPermission('FamilyRelationshipRequests.ViewDetails')) return;
    this.close();
    const sequence = this.detailSequence;
    this.detailLoading.set(true);
    try {
      const result = await firstValueFrom(this.api.adminGovernanceDetails(id));
      if (sequence === this.detailSequence) this.governanceReview.set(result.items[0] ?? null);
    } catch (error) {
      if (sequence === this.detailSequence) this.fail(error);
    } finally {
      if (sequence === this.detailSequence) this.detailLoading.set(false);
    }
  }

  canDecide(action: ReviewAction): boolean {
    const child = this.childReview();
    if (child)
      return (
        action !== 'refer-governance' &&
        ['PendingReview', 'ModificationRequested'].includes(child.request.status) &&
        this.session.hasPermission('ChildOnboarding.Decide') &&
        (action !== 'approve' || this.session.hasPermission('FamilyRelationshipRequests.Approve'))
      );
    const governance = this.governanceReview();
    if (
      !governance ||
      !['PendingReview', 'ModificationRequested'].includes(governance.request.status)
    )
      return false;
    const permission =
      action === 'reject'
        ? 'FamilyRelationshipRequests.Reject'
        : action === 'request-modification'
          ? 'FamilyRelationshipRequests.RequestModification'
          : 'FamilyRelationshipRequests.Approve';
    return (
      this.session.hasPermission(permission) &&
      !(action === 'approve' && governance.request.kind === 'MembershipConflict')
    );
  }

  ask(action: ReviewAction): void {
    if (this.canDecide(action)) {
      this.confirming.set(action);
      this.reason = '';
      this.intent = null;
    }
  }

  async decide(): Promise<void> {
    const action = this.confirming();
    if (!action || !this.canDecide(action) || this.busy()) return;
    const child = this.childReview(),
      governance = this.governanceReview();
    if ((action !== 'approve' || governance) && !this.reason.trim()) return;
    if (
      child &&
      action === 'approve' &&
      child.possibleMatches.length &&
      !this.confirmedExistingPatientId
    ) {
      this.toast.error(this.language.t('familyReview.chooseMatch'));
      return;
    }
    const body = {
      rowVersion: child?.request.rowVersion ?? governance!.request.rowVersion,
      reason: this.reason.trim() || null,
      confirmedExistingPatientId: this.confirmedExistingPatientId || null,
    };
    const id = child?.request.requestId ?? governance!.request.caseId;
    const signature = JSON.stringify([id, action, body]);
    if (this.intent?.signature !== signature)
      this.intent = { signature, key: createIdempotencyKey() };
    this.busy.set(true);
    const sequence = this.detailSequence;
    try {
      if (child && action !== 'refer-governance')
        await firstValueFrom(this.api.decideOnboarding(id, action, body, this.intent.key));
      else
        await firstValueFrom(
          this.api.decideGovernance(
            id,
            action,
            body.rowVersion,
            this.reason.trim(),
            this.intent.key,
          ),
        );
      if (sequence !== this.detailSequence) return;
      this.toast.success(this.language.t('familyFlow.saved'));
      this.close();
      await this.load();
    } catch (error) {
      if (sequence === this.detailSequence) {
        this.fail(error);
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.close();
          if (child) await this.inspectChild(id);
          else await this.inspectGovernance(id);
        }
      }
    } finally {
      this.busy.set(false);
    }
  }

  async evidence(documentId: string): Promise<void> {
    const child = this.childReview(),
      governance = this.governanceReview();
    if (
      (!child && !governance) ||
      (child && !this.session.hasPermission('ChildOnboarding.ViewEvidence'))
    )
      return;
    const sequence = this.detailSequence;
    try {
      const response = child
        ? await firstValueFrom(this.api.onboardingEvidence(child.request.requestId, documentId))
        : await firstValueFrom(this.api.governanceEvidence(governance!.request.caseId, documentId));
      if (!response.body || sequence !== this.detailSequence) return;
      const url = URL.createObjectURL(response.body);
      this.urls.add(url);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'evidence';
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        this.urls.delete(url);
      }, 1000);
    } catch (error) {
      if (sequence === this.detailSequence) this.fail(error);
    }
  }

  async loadAuthorities(): Promise<void> {
    const id = this.childReview()?.request.familyRelationshipRequestId;
    if (!id || !this.session.hasPermission('FamilyOperationalProofRequests.Revoke')) return;
    const sequence = this.detailSequence;
    try {
      const result = await firstValueFrom(this.api.authorities(id));
      if (sequence === this.detailSequence) this.authorities.set(result);
    } catch (error) {
      if (sequence === this.detailSequence) this.fail(error);
    }
  }

  identitySnapshot(snapshot: string): {
    nameAr: string;
    nameEn: string | null;
    dateOfBirth: string;
    gender: 'Male' | 'Female' | null;
  } | null {
    try {
      const value: unknown = JSON.parse(snapshot);
      if (
        !value ||
        typeof value !== 'object' ||
        !('NameAr' in value) ||
        typeof value.NameAr !== 'string' ||
        !('DateOfBirth' in value) ||
        typeof value.DateOfBirth !== 'string'
      )
        return null;
      const gender = 'Gender' in value ? value.Gender : null;
      return {
        nameAr: value.NameAr,
        nameEn: 'NameEn' in value && typeof value.NameEn === 'string' ? value.NameEn : null,
        dateOfBirth: value.DateOfBirth,
        gender:
          gender === 1 || gender === 'Male'
            ? 'Male'
            : gender === 2 || gender === 'Female'
              ? 'Female'
              : null,
      };
    } catch {
      return null;
    }
  }

  async revoke(): Promise<void> {
    const authority = this.revoking();
    if (
      !authority?.isActive ||
      !this.reason.trim() ||
      this.busy() ||
      !this.session.hasPermission('FamilyOperationalProofRequests.Revoke')
    )
      return;
    const signature = JSON.stringify([
      authority.authorityId,
      authority.rowVersion,
      this.reason.trim(),
    ]);
    if (this.intent?.signature !== signature)
      this.intent = { signature, key: createIdempotencyKey() };
    this.busy.set(true);
    const sequence = this.detailSequence;
    try {
      await firstValueFrom(
        this.api.revokeAuthority(
          authority.authorityId,
          authority.rowVersion,
          this.reason.trim(),
          this.intent.key,
        ),
      );
      if (sequence === this.detailSequence) {
        this.toast.success(this.language.t('familyFlow.saved'));
        this.revoking.set(null);
        await this.loadAuthorities();
      }
    } catch (error) {
      if (sequence === this.detailSequence) this.fail(error);
    } finally {
      this.busy.set(false);
    }
  }

  close(): void {
    this.detailSequence++;
    this.detailLoading.set(false);
    this.reason = '';
    this.intent = null;
    this.childReview.set(null);
    this.governanceReview.set(null);
    this.confirming.set(null);
    this.authorities.set([]);
    this.revoking.set(null);
    this.confirmedExistingPatientId = '';
    this.urls.forEach((url) => URL.revokeObjectURL(url));
    this.urls.clear();
  }

  private fail(error: unknown): void {
    this.failed.set(true);
    this.toast.error(
      this.language.t(
        error instanceof HttpErrorResponse && error.status === 409
          ? 'familyFlow.conflict'
          : 'familyFlow.failed',
      ),
    );
    if (error instanceof HttpErrorResponse && [401, 403, 404].includes(error.status)) {
      this.close();
      this.onboarding.set([]);
      this.governance.set([]);
    }
  }
}
