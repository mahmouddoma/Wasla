import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnChanges,
  output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  CommercialCatalog,
  CommercialPlan,
  SubscriptionSelection,
} from '../../../../domains/subscriptions';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-plan-selector',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, TranslatePipe],
  templateUrl: './plan-selector.component.html',
  styleUrl: './plan-selector.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanSelectorComponent implements OnChanges {
  readonly language = inject(LanguageService);
  readonly catalog = input.required<CommercialCatalog>();
  readonly selection = input<SubscriptionSelection | null>(null);
  readonly allowTrial = input(false);
  readonly productCode = input<string | null>(null);
  readonly disabled = input(false);
  readonly selectionChange = output<SubscriptionSelection>();

  readonly cycle = signal<'Monthly' | 'Annual'>('Monthly');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selection'] && this.selection()?.billingCycle) {
      const c = this.selection()!.billingCycle;
      if (c === 'Monthly' || c === 'Annual') {
        this.cycle.set(c);
      }
    }
  }

  toggleCycle(): void {
    if (this.disabled()) return;
    this.setCycle(this.cycle() === 'Monthly' ? 'Annual' : 'Monthly');
  }

  setCycle(newCycle: 'Monthly' | 'Annual'): void {
    if (this.disabled()) return;
    this.cycle.set(newCycle);
    const sel = this.selection();
    if (sel && sel.productCode === 'FULL_PLATFORM' && sel.planCode) {
      this.choose(sel.productCode, sel.planCode, newCycle);
    }
  }

  private readonly bookingCount = signal<number | null>(null);
  readonly bookingProduct = computed(() =>
    this.catalog().products.find(
      (product) =>
        product.code === 'ONLINE_BOOKING_ONLY' &&
        (!this.productCode() || product.code === this.productCode()),
    ),
  );

  readonly isBookingEnabled = computed(() =>
    Boolean(
      this.catalog().bookingOnly.enabled &&
      this.bookingProduct()?.enabled &&
      typeof this.catalog().bookingOnly.monthlyUnitPrice === 'number',
    ),
  );
  readonly count = computed(
    () =>
      this.bookingCount() ??
      this.selection()?.selectedPracticeCount ??
      this.catalog().bookingOnly.minimumSelectedPractices ??
      1,
  );
  readonly bookingQuote = computed(() => {
    const count = this.count();
    return this.isBookingEnabled() &&
      Number.isInteger(count) &&
      count >= (this.catalog().bookingOnly.minimumSelectedPractices ?? 1) &&
      count <= 2147483647
      ? { monthlyPrice: count * this.catalog().bookingOnly.monthlyUnitPrice! }
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

  readonly availableCycles = computed(() => {
    const cycles = new Set(this.options().map((o) => o.cycle));
    return Array.from(cycles);
  });

  readonly displayedOptions = computed(() => {
    const all = this.options();
    const cur = this.cycle();
    const filtered = all.filter((o) => o.cycle === cur);
    return filtered.length > 0 ? filtered : all;
  });

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

  getPlanIcon(planCode: string): string {
    switch (planCode) {
      case 'STARTER':
        return 'fa-solid fa-stethoscope';
      case 'PROFESSIONAL':
        return 'fa-solid fa-award';
      case 'PREMIUM':
        return 'fa-solid fa-crown';
      case 'ONLINE_BOOKING_ONLY':
      case 'BOOKING_ONLY':
        return 'fa-solid fa-calendar-check';
      default:
        return 'fa-solid fa-hospital';
    }
  }

  getPlanFeatures(plan: CommercialPlan): string[] {
    return (plan.features ?? [])
      .filter((feature) => ['Full', 'ReadOnly'].includes(feature.accessLevel))
      .map((feature) => {
        const name = this.language.currentLang() === 'ar' ? feature.nameAr : feature.nameEn;
        const translated = this.language.t('subscriptions.feature.' + feature.code);
        const label =
          name ||
          (translated.startsWith('subscriptions.feature.')
            ? feature.code
            : translated);
        return feature.accessLevel === 'ReadOnly'
          ? label + ' · ' + this.language.t('subscriptions.readOnlyFeature')
          : label;
      });
  }

  getBookingFeatures(): string[] {
    const plan = this.bookingProduct()?.plans.find(
      (plan) => plan.code === this.catalog().bookingOnly.planCode,
    );
    return plan ? this.getPlanFeatures(plan) : [];
  }

  isSelected(option: {
    product: { code: string };
    plan: { code: string };
    cycle: string;
  }): boolean {
    const sel = this.selection();
    return (
      !sel?.offerCode &&
      sel?.productCode === option.product.code &&
      sel?.planCode === option.plan.code &&
      sel?.billingCycle === option.cycle
    );
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
    if (!this.disabled() && this.isBookingEnabled() && this.bookingProduct() && this.bookingQuote())
      this.selectionChange.emit({
        productCode: 'ONLINE_BOOKING_ONLY',
        planCode: this.catalog().bookingOnly.planCode,
        billingCycle: 'Monthly',
        selectedPracticeCount: this.count(),
      });
  }
}
