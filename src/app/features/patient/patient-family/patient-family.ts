import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import {
  FamiliesApi,
  ChildOnboardingReview,
  FamilyGovernanceDetails,
  FamilyRequestDetails,
  FamilyRequestPage,
  FamilyRequestType,
  FamilyRequestStatus,
  FamilyPendingWorkflow,
  FamilyWorkspace,
  FamilyWorkspaceApi,
  FamilyWorkspaceChild,
} from '../../../domains/families';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';
import { FamilyIntakeComponent, FamilyIntakeMode } from '../family-intake/family-intake.component';
import { DependentDetailsComponent } from '../dependent-details/dependent-details.component';

@Component({
  selector: 'app-patient-family',
  imports: [
    DatePipe,
    FormsModule,
    NgTemplateOutlet,
    RouterLink,
    TranslatePipe,
    PageHeader,
    SideDrawer,
    FamilyIntakeComponent,
    DependentDetailsComponent,
  ],
  templateUrl: './patient-family.html',
  styleUrl: './patient-family.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientFamily implements OnDestroy {
  readonly language = inject(LanguageService);
  readonly session = inject(AuthSession);
  private readonly api = inject(FamilyWorkspaceApi);
  private readonly relationships = inject(FamiliesApi);
  private readonly toast = inject(ToastService);
  readonly workspace = signal<FamilyWorkspace | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly intakeMode = signal<FamilyIntakeMode | null>(null);
  readonly selectedChild = signal<FamilyWorkspaceChild | null>(null);
  readonly detailTab = signal<'profile' | 'tickets' | 'transactions' | 'documents'>('profile');
  readonly onboarding = signal<ChildOnboardingReview[]>([]);
  readonly governance = signal<FamilyGovernanceDetails[]>([]);
  readonly selectedOnboarding = signal<ChildOnboardingReview | null>(null);
  readonly selectedGovernance = signal<FamilyGovernanceDetails | null>(null);
  readonly selectedRelationship = signal<FamilyRequestDetails | null>(null);
  readonly requestPage = signal(1);
  readonly governanceTotal = signal(0);
  readonly requestLoading = signal(false);
  readonly showingHistory = signal(false);
  readonly relationshipHistory = signal<FamilyRequestPage | null>(null);
  readonly relationshipLoading = signal(false);
  readonly relationshipTypes: readonly FamilyRequestType[] = [
    'CreateFamily',
    'AddFamilyMember',
    'VerifyParentChild',
    'VerifyGuardianChild',
    'VerifyOperationalParentChild',
    'JoinFamilyAsParent',
  ];
  requestStatus: FamilyRequestStatus | '' = '';
  requestType: FamilyRequestType | '' = '';
  requestSearch = '';

  private readonly resizeListener = () => {
    if (typeof window !== 'undefined') {
      this.isDesktop.set(window.innerWidth >= 1025);
    }
  };

  readonly isDesktop = signal(
    typeof window !== 'undefined' ? window.innerWidth >= 1025 : true,
  );

  readonly hasActiveDetail = computed(
    () =>
      !!this.intakeMode() ||
      !!this.selectedChild() ||
      !!this.selectedOnboarding() ||
      !!this.selectedGovernance() ||
      !!this.selectedRelationship(),
  );

  readonly detailTitle = computed(() => {
    if (this.selectedChild()) return this.selectedChild()!.nameAr;
    if (this.selectedOnboarding()) {
      return this.selectedOnboarding()!.intake.nameAr || this.language.t('familyFlow.requests');
    }
    if (this.selectedGovernance()) {
      return this.language.t('familyFlow.kind.' + this.selectedGovernance()!.request.kind);
    }
    if (this.selectedRelationship()) {
      const rel = this.selectedRelationship()!;
      return rel.targetNameAr && rel.targetNameAr !== '***'
        ? rel.targetNameAr
        : this.language.t('familyFlow.requestType.' + rel.requestType);
    }
    if (this.intakeMode()) {
      const mode = this.intakeMode()!;
      if (mode === 'onboard') return this.language.t('familyFlow.addChild');
      if (mode === 'search') return this.language.t('familyFlow.linkChild');
      if (mode === 'redeem') return this.language.t('familyFlow.redeem');
      return this.language.t('familyFlow.requests');
    }
    return this.language.t('familyFlow.requests');
  });

  isSelectedWorkflow(item: FamilyPendingWorkflow): boolean {
    return (
      this.selectedOnboarding()?.request?.requestId === item.reference ||
      this.selectedGovernance()?.request?.caseId === item.reference
    );
  }

  isSelectedOnboarding(id: string): boolean {
    return this.selectedOnboarding()?.request?.requestId === id;
  }

  isSelectedGovernance(caseId: string): boolean {
    return this.selectedGovernance()?.request?.caseId === caseId;
  }

  isSelectedRelationship(id: string): boolean {
    return this.selectedRelationship()?.requestId === id;
  }

  private sequence = 0;
  private requestsSequence = 0;
  private relationshipsSequence = 0;
  readonly onboardingHasNext = signal(false);
  readonly governanceHasNext = computed(() => this.requestPage() * 20 < this.governanceTotal());
  private detailSequence = 0;

  constructor() {
    void this.load();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.resizeListener);
    }
  }

  ngOnDestroy(): void {
    ++this.requestsSequence;
    ++this.relationshipsSequence;
    this.sequence++;
    this.close();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeListener);
    }
  }
  async load(): Promise<void> {
    ++this.requestsSequence;
    ++this.relationshipsSequence;
    const sequence = ++this.sequence;
    this.loading.set(true);
    this.failed.set(false);
    this.requestLoading.set(false);
    this.relationshipLoading.set(false);
    this.workspace.set(null);
    this.showingHistory.set(false);
    this.relationshipHistory.set(null);
    this.onboarding.set([]);
    this.governance.set([]);
    this.onboardingHasNext.set(false);
    this.governanceTotal.set(0);
    this.requestPage.set(1);
    this.close();
    try {
      const workspace = await firstValueFrom(this.api.workspace());
      if (sequence === this.sequence) this.workspace.set(workspace);
    } catch (error) {
      if (sequence === this.sequence) {
        this.failed.set(true);
        this.handleError(error);
      }
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }
  start(mode: FamilyIntakeMode, child?: FamilyWorkspaceChild): void {
    const workspace = this.workspace();
    if (!workspace) return;
    if (
      (mode === 'search' && !workspace.canStartExistingChildLink) ||
      (mode === 'onboard' && !workspace.canStartChildOnboarding) ||
      (mode === 'redeem' && !this.session.hasPermission('FamilyJoinInvitations.RedeemOwn')) ||
      (mode === 'identity' && !child?.canRequestIdentityCorrection) ||
      (mode === 'invite' &&
        (!child || !this.session.hasPermission('FamilyJoinInvitations.CreateOwn')))
    )
      return;
    this.close();
    this.selectedChild.set(child ?? null);
    this.intakeMode.set(mode);
  }
  inspectChild(
    child: FamilyWorkspaceChild,
    tab: 'profile' | 'tickets' | 'transactions' | 'documents',
  ): void {
    this.close();
    this.detailTab.set(tab);
    this.selectedChild.set(child);
  }
  async loadRequests(page = 1): Promise<void> {
    if (page < 1) return;
    const requestSequence = ++this.requestsSequence;
    this.showingHistory.set(true);
    if (page === 1) void this.loadRelationshipRequests();
    const sequence = this.sequence;
    this.requestLoading.set(true);
    this.onboarding.set([]);
    this.governance.set([]);
    const results = await Promise.allSettled([
      this.session.hasPermission('ChildOnboarding.ViewOwn')
        ? firstValueFrom(this.api.onboardingRequests(page))
        : Promise.resolve([]),
      firstValueFrom(this.api.governanceCases(page)),
    ]);
    if (sequence !== this.sequence || requestSequence !== this.requestsSequence) return;
    const denied = results.find(result => result.status === 'rejected' && result.reason instanceof HttpErrorResponse && [401, 403].includes(result.reason.status));
    if (denied?.status === 'rejected') {
      this.requestLoading.set(false);
      this.handleError(denied.reason);
      return;
    }
    this.onboardingHasNext.set(results[0].status === 'fulfilled' && results[0].value.length === 20);
    if (results[0].status === 'fulfilled') this.onboarding.set(results[0].value);
    else this.handleError(results[0].reason);
    if (results[1].status === 'fulfilled') {
      this.governance.set(results[1].value.items);
      this.governanceTotal.set(results[1].value.totalCount);
    } else this.handleError(results[1].reason);
    this.requestPage.set(page);
    this.requestLoading.set(false);
  }
  async openWorkflow(item: FamilyPendingWorkflow): Promise<void> {
    if (item.kind === 'ChildOnboarding') await this.openOnboarding(item.reference);
    else if (item.kind === 'IdentityCorrection' || item.kind === 'MembershipConflict')
      await this.openGovernance(item.reference);
    else if (item.kind === 'SecondParentInvitation')
      this.toast.success(this.language.t('familyFlow.invitationPending'));
  }
  async loadRelationshipRequests(pageNumber = 1): Promise<void> {
    if (!this.session.hasPermission('FamilyRelationshipRequests.ViewOwn')) return;
    const sequence = this.sequence;
    const requestSequence = ++this.relationshipsSequence;
    this.relationshipLoading.set(true);
    this.relationshipHistory.set(null);
    try {
      const result = await firstValueFrom(
        this.relationships.requests({
          pageNumber,
          pageSize: 20,
          status: this.requestStatus,
          requestType: this.requestType,
          search: this.requestSearch.trim(),
        }),
      );
      if (sequence === this.sequence && requestSequence === this.relationshipsSequence) this.relationshipHistory.set(result);
    } catch (error) {
      if (sequence === this.sequence && requestSequence === this.relationshipsSequence) this.handleError(error);
    } finally {
      if (sequence === this.sequence && requestSequence === this.relationshipsSequence) this.relationshipLoading.set(false);
    }
  }
  async openOnboarding(id: string): Promise<void> {
    this.close();
    const sequence = this.detailSequence;
    try {
      const reviews = await firstValueFrom(this.api.onboardingDetails(id));
      if (sequence === this.detailSequence) this.selectedOnboarding.set(reviews[0] ?? null);
    } catch (error) {
      if (sequence === this.detailSequence) this.handleError(error);
    }
  }
  async openGovernance(id: string): Promise<void> {
    this.close();
    const sequence = this.detailSequence;
    try {
      const result = await firstValueFrom(this.api.governanceDetails(id));
      if (sequence === this.detailSequence) this.selectedGovernance.set(result.items[0] ?? null);
    } catch (error) {
      if (sequence === this.detailSequence) this.handleError(error);
    }
  }
  async openRelationship(id: string): Promise<void> {
    this.close();
    const sequence = this.detailSequence;
    try {
      const result = await firstValueFrom(this.relationships.details(id));
      if (sequence === this.detailSequence) this.selectedRelationship.set(result);
    } catch (error) {
      if (sequence === this.detailSequence) this.handleError(error);
    }
  }
  close(): void {
    this.detailSequence++;
    this.busy.set(false);
    this.intakeMode.set(null);
    this.selectedChild.set(null);
    this.selectedOnboarding.set(null);
    this.selectedGovernance.set(null);
    this.selectedRelationship.set(null);
  }
  refreshScope(): void {
    this.close();
    void this.load();
  }
  private handleError(error: unknown): void {
    this.toast.error(this.language.t('familyFlow.failed'));
    if (error instanceof HttpErrorResponse && [401, 403, 404].includes(error.status)) {
      ++this.sequence;
      ++this.requestsSequence;
      ++this.relationshipsSequence;
      this.loading.set(false);
      this.requestLoading.set(false);
      this.relationshipLoading.set(false);
      this.workspace.set(null);
      this.onboarding.set([]);
      this.governance.set([]);
      this.relationshipHistory.set(null);
      this.close();
    }
  }
}
