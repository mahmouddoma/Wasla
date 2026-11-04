import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
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
} from '../../../../domains/subscriptions';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { PlanSelectorComponent } from '../../components/plan-selector/plan-selector.component';

@Component({
  selector: 'app-my-subscription',
  imports: [CurrencyPipe, DatePipe, FormsModule, TranslatePipe, PageHeader, PlanSelectorComponent],
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
  readonly selection = signal<SubscriptionSelection | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal(false);
  readonly noSubscription = signal(false);
  readonly confirmation = signal<'selection' | 'change' | 'cancel' | null>(null);
  changeType: SubscriptionChangeType = 'UpgradePlan';
  reason = '';

  getSelectedPlanName(): string {
    const sel = this.selection();
    if (!sel) return '';
    const cat = this.catalog();
    if (cat) {
      for (const prod of cat.products) {
        const p = prod.plans.find((x) => x.code === sel.planCode);
        if (p) {
          return this.language.currentLang() === 'ar'
            ? p.nameAr || p.nameEn || p.code
            : p.nameEn || p.nameAr || p.code;
        }
      }
    }
    return sel.planCode;
  }

  constructor() {
    void this.load();
  }
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    this.noSubscription.set(false);
    const results = await Promise.allSettled([
      this.state.refresh(true),
      firstValueFrom(this.api.catalog()),
    ]);
    if (results[1].status === 'fulfilled') this.catalog.set(results[1].value);
    else this.catalog.set(null);
    if (results[0].status === 'rejected') {
      const parsed = parseApiErrors(results[0].reason);
      if (parsed.status === 404 && parsed.codes.includes('Subscription.NotFound')) {
        this.state.invalidate();
        this.noSubscription.set(true);
      } else this.error.set(true);
    }
    if (results[1].status === 'rejected') this.error.set(true);
    this.loading.set(false);
  }
  async confirm(): Promise<void> {
    const action = this.confirmation();
    const selected = this.selection();
    const details = this.state.details();
    if (!action || this.busy() || this.error()) return;
    if (action !== 'selection' && !details?.rowVersion) return;
    if (
      (action === 'selection' || action === 'change') &&
      !isAvailableSelection(this.catalog(), selected)
    )
      return;
    if (action === 'change' && !this.reason.trim()) return;
    this.busy.set(true);
    try {
      const request =
        action === 'cancel'
          ? this.api.cancelAtPeriodEnd(details!.rowVersion)
          : action === 'selection'
            ? this.api.select(selected!)
            : this.api.requestChange({
                changeType: this.changeType,
                targetPlanCode: selected!.planCode,
                targetBillingCycle: selected!.billingCycle,
                targetPracticeCount: selected!.selectedPracticeCount,
                reason: this.reason.trim(),
                rowVersion: details!.rowVersion,
              });
      await firstValueFrom(request);
      this.toast.success(
        this.language.t(
          action === 'cancel' ? 'subscriptions.cancelledEnd' : 'subscriptions.requestSent',
        ),
      );
      this.confirmation.set(null);
      this.selection.set(null);
      this.state.invalidate();
      await this.load();
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.toast.error(this.language.t(parsed.messages[0] ?? 'common.requestFailed'));
      if (parsed.status === 409 || parsed.status === 403 || parsed.status === 422)
        await this.load();
    } finally {
      this.busy.set(false);
    }
  }
}
