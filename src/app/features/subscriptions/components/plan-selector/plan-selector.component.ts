import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import {
  CommercialCatalog,
  CommercialPlan,
  SubscriptionSelection,
} from '../../../../domains/subscriptions';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-plan-selector',
  imports: [CurrencyPipe, TranslatePipe],
  templateUrl: './plan-selector.component.html',
  styleUrl: './plan-selector.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanSelectorComponent {
  readonly language = inject(LanguageService);
  readonly catalog = input.required<CommercialCatalog>();
  readonly selection = input<SubscriptionSelection | null>(null);
  readonly allowTrial = input(false);
  readonly productCode = input<string | null>(null);
  readonly disabled = input(false);
  readonly selectionChange = output<SubscriptionSelection>();
  private readonly bookingCount = signal<number | null>(null);
  readonly bookingProduct = computed(() =>
    this.catalog().bookingOnly.enabled
      ? this.catalog().products.find(
          (product) =>
            product.enabled &&
            product.code === 'ONLINE_BOOKING_ONLY' &&
            (!this.productCode() || product.code === this.productCode()),
        )
      : undefined,
  );
  readonly count = computed(
    () =>
      this.bookingCount() ??
      this.selection()?.selectedPracticeCount ??
      this.catalog().bookingOnly.pricingTiers[0]?.minPracticeCount ??
      null,
  );
  readonly bookingTier = computed(() => {
    const count = this.count();
    return count !== null &&
      Number.isInteger(count) &&
      count > 0 &&
      count <= this.catalog().bookingOnly.maximumSelectablePractices
      ? this.catalog().bookingOnly.pricingTiers.find(
          (tier) => count >= tier.minPracticeCount && count <= tier.maxPracticeCount,
        )
      : undefined;
  });
  readonly options = computed(() =>
    this.catalog()
      .products.filter(
        (product) =>
          product.enabled && (!this.productCode() || product.code === this.productCode()),
      )
      .filter((product) => product.code === 'FULL_PLATFORM')
      .flatMap((product) =>
        product.plans
          .filter((plan) => plan.pricing)
          .flatMap((plan) =>
            plan.billingCycles.map((cycle) => ({
              key: `${product.code}/${plan.code}/${cycle}`,
              product,
              plan,
              cycle,
              price: cycle === 'Annual' ? plan.pricing!.annualPrice : plan.pricing!.monthlyPrice,
            })),
          )
          .filter((option) => option.price !== null),
      ),
  );
  readonly trialPlan = computed(() =>
    this.catalog()
      .products.find((product) => product.enabled && product.code === 'FULL_PLATFORM')
      ?.plans.find((plan) => plan.code === 'STARTER'),
  );
  name(value: { nameAr: string; nameEn: string }): string {
    return this.language.currentLang() === 'ar'
      ? value.nameAr || value.nameEn
      : value.nameEn || value.nameAr;
  }
  choose(productCode: string, planCode: string, billingCycle: 'Monthly' | 'Annual'): void {
    if (!this.disabled()) this.selectionChange.emit({ productCode, planCode, billingCycle });
  }
  chooseTrial(): void {
    if (
      !this.disabled() &&
      this.allowTrial() &&
      this.catalog().trialOffer.enabled &&
      this.trialPlan()
    ) {
      this.selectionChange.emit({
        productCode: 'FULL_PLATFORM',
        planCode: 'STARTER',
        offerCode: this.catalog().trialOffer.offerCode,
      });
    }
  }
  setBookingCount(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.bookingCount.set(input.value ? input.valueAsNumber : null);
    if (this.selection()?.productCode === 'ONLINE_BOOKING_ONLY') this.chooseBooking();
  }
  chooseBooking(): void {
    if (!this.disabled() && this.bookingProduct() && this.bookingTier())
      this.selectionChange.emit({
        productCode: 'ONLINE_BOOKING_ONLY',
        planCode: this.catalog().bookingOnly.planCode,
        billingCycle: 'Monthly',
        selectedPracticeCount: this.count(),
      });
  }
  readyFeatures(plan: CommercialPlan): string {
    const names = plan.features
      .filter((feature) => feature.isReleaseReady)
      .map((feature) =>
        this.language.currentLang() === 'ar'
          ? feature.nameAr || feature.nameEn || feature.code
          : feature.nameEn || feature.nameAr || feature.code,
      );
    return new Intl.ListFormat(this.language.currentLang(), {
      style: 'short',
      type: 'conjunction',
    }).format(names);
  }
}
