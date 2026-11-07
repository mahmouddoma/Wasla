import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import {
  CommercialCatalog,
  isAvailableSelection,
  SubscriptionsApi,
  SubscriptionSelection,
  SubscriptionState,
  SubscriptionChangeType,
  TrialEligibility,
  RenewalPreview,
  RetainedAllocation,
} from '../../../../domains/subscriptions';
import { AllocationReceptionOption } from '../../../../domains/subscriptions/subscriptions-api';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import { PlanSelectorComponent } from '../../components/plan-selector/plan-selector.component';

@Component({
  selector: 'app-my-subscription',
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    TranslatePipe,
    PageHeader,
    SideDrawer,
    PlanSelectorComponent,
  ],
  templateUrl: './my-subscription.component.html',
  styleUrls: ['../../subscriptions.css', './my-subscription.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MySubscriptionComponent {
  readonly language = inject(LanguageService);
  readonly state = inject(SubscriptionState);
  readonly session = inject(AuthSession);
  private readonly api = inject(SubscriptionsApi);
  private readonly toast = inject(ToastService);
  readonly catalog = signal<CommercialCatalog | null>(null);
  readonly trial = signal<TrialEligibility | null>(null);
  readonly selection = signal<SubscriptionSelection | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal(false);
  readonly noSubscription = signal(false);
  readonly confirmation = signal<'selection' | 'change' | 'cancel' | 'trial' | 'renewal' | null>(
    null,
  );
  readonly renewal = signal<RenewalPreview | null>(null);
  readonly retained = signal<RetainedAllocation[]>([]);
  readonly staff = signal<AllocationReceptionOption[]>([]);
  changeType: SubscriptionChangeType = 'UpgradePlan';
  reason = '';
  private intent: { signature: string; key: string } | null = null;
  constructor() {
    void this.load();
  }
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    const results = await Promise.allSettled([
      this.state.refresh(true),
      firstValueFrom(this.api.catalog()),
      firstValueFrom(this.api.trialEligibility()),
    ]);
    if (results[1].status === 'fulfilled') this.catalog.set(results[1].value);
    if (results[2].status === 'fulfilled') this.trial.set(results[2].value);
    else this.trial.set(null);
    this.error.set(results[0].status === 'rejected' || results[1].status === 'rejected');
    this.noSubscription.set(this.state.contracts().length === 0);
    this.loading.set(false);
  }
  selectContract(id: string): void {
    if (this.busy()) return;
    this.state.selectContract(id);
    this.confirmation.set(null);
    this.renewal.set(null);
    this.retained.set([]);
  }
  getSelectedPlanName(): string {
    const selected = this.selection();
    const plan = this.catalog()
      ?.products.flatMap((p) => p.plans)
      .find((p) => p.code === selected?.planCode);
    return plan ? (this.language.isRtl() ? plan.nameAr : plan.nameEn) : (selected?.planCode ?? '');
  }
  contractName(): string {
    return this.state.terms()?.planCode ?? '';
  }
  practiceName(id: string): string {
    return (
      this.state.selectedContract()?.practices.find((p) => p.practiceId === id)?.nameAr ??
      this.language.t('subscriptions.practice')
    );
  }
  async prepareRenewal(): Promise<void> {
    const id = this.state.selectedContractId(),
      selected = this.selection();
    if (!id || !selected || !isAvailableSelection(this.catalog(), selected) || this.busy()) return;
    this.busy.set(true);
    try {
      const preview = await firstValueFrom(this.api.renewalPreview(id, selected));
      if (this.state.selectedContractId() !== id) return;
      this.renewal.set(preview);
      this.retained.set([]);
      if (this.session.hasPermission('ReceptionUsers.ViewOwn'))
        this.staff.set(await firstValueFrom(this.api.allocationReceptionOptions()));
      this.confirmation.set('renewal');
    } catch (error) {
      this.failure(error);
    } finally {
      this.busy.set(false);
    }
  }
  retainPractice(practiceId: string, allocationId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.retained.update((items) =>
      checked
        ? [
            ...items.filter((p) => p.practiceId !== practiceId),
            { practiceId, allocationId, receptionIds: [] },
          ]
        : items.filter((p) => p.practiceId !== practiceId),
    );
  }
  isRetained(id: string): boolean {
    return this.retained().some((p) => p.practiceId === id);
  }
  assignedStaff(id: string): AllocationReceptionOption[] {
    return this.staff().filter(
      (s) => s.isActive && s.assignments.some((a) => a.isActive && a.doctorPracticeId === id),
    );
  }
  retainStaff(practiceId: string, receptionId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.retained.update((items) =>
      items.map((p) =>
        p.practiceId === practiceId
          ? {
              ...p,
              receptionIds: checked
                ? [...new Set([...p.receptionIds, receptionId])]
                : p.receptionIds.filter((id) => id !== receptionId),
            }
          : p,
      ),
    );
  }
  renewalValid(): boolean {
    const terms = this.renewal()?.terms;
    return (
      !!terms &&
      this.retained().length <= terms.practiceLimit &&
      new Set(this.retained().flatMap((p) => p.receptionIds)).size <= terms.receptionLimit
    );
  }
  async confirm(): Promise<void> {
    const action = this.confirmation(),
      selected = this.selection(),
      details = this.state.details(),
      id = this.state.selectedContractId();
    if (!action || this.busy() || this.error()) return;
    if (['cancel', 'change', 'renewal'].includes(action) && (!id || !details?.rowVersion)) return;
    if (
      ['selection', 'change', 'renewal'].includes(action) &&
      !isAvailableSelection(this.catalog(), selected)
    )
      return;
    if (
      action === 'trial' &&
      (!this.trial()?.canActivate || !this.session.hasPermission('Subscriptions.ActivateTrialOwn'))
    )
      return;
    if (
      action === 'change' &&
      (!this.reason.trim() || !this.session.hasPermission('Subscriptions.RequestChangeOwn'))
    )
      return;
    if (action === 'cancel' && !this.session.hasPermission('Subscriptions.CancelAtPeriodEndOwn'))
      return;
    if (action === 'renewal' && !this.renewalValid()) return;
    if (
      ['selection', 'renewal'].includes(action) &&
      !this.session.hasPermission('Subscriptions.RequestChangeOwn')
    )
      return;
    const signature = JSON.stringify({
      action,
      id,
      selected,
      rowVersion: details?.rowVersion,
      reason: this.reason,
      retained: this.retained(),
    });
    if (this.intent?.signature !== signature)
      this.intent = { signature, key: createIdempotencyKey() };
    const key = this.intent.key;
    this.busy.set(true);
    try {
      const request =
        action === 'trial'
          ? this.api.activateTrial(key)
          : action === 'cancel'
            ? this.api.cancelContract(id, details!.rowVersion, this.reason, key)
            : action === 'selection'
              ? this.api.selectContract(selected!, key)
              : action === 'renewal'
                ? this.api.saveRenewal(
                    id,
                    {
                      rowVersion: this.renewal()!.periodRowVersion,
                      targetPlanCode: selected!.planCode,
                      targetBillingCycle: selected!.billingCycle!,
                      targetPracticeCount: selected!.selectedPracticeCount,
                      retainedAllocations: this.retained(),
                    },
                    key,
                  )
                : this.api.changeContract(
                    id,
                    {
                      changeType: this.changeType,
                      targetPlanCode: selected!.planCode,
                      targetBillingCycle: selected!.billingCycle,
                      targetPracticeCount: selected!.selectedPracticeCount,
                      reason: this.reason.trim(),
                      rowVersion: details!.rowVersion,
                    },
                    key,
                  );
      await firstValueFrom(request);
      this.toast.success(
        action === 'cancel'
          ? 'subscriptions.cancelledEnd'
          : action === 'trial'
            ? 'subscriptions.trialActivated'
            : 'subscriptions.requestSent',
      );
      this.confirmation.set(null);
      this.selection.set(null);
      this.intent = null;
      this.state.invalidate();
      await this.load();
    } catch (error) {
      this.failure(error);
      if ([403, 409, 422].includes(parseApiErrors(error).status)) await this.load();
    } finally {
      this.busy.set(false);
    }
  }
  private failure(error: unknown): void {
    this.toast.error(this.language.t(parseApiErrors(error).messages[0] ?? 'common.requestFailed'));
  }
}
