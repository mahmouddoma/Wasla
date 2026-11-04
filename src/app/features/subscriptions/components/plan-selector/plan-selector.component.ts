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
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
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
        (this.catalog().bookingOnly.pricingTiers?.length ?? 0) > 0,
    ),
  );

  readonly count = computed(
    () =>
      this.bookingCount() ??
      this.selection()?.selectedPracticeCount ??
      this.catalog().bookingOnly.pricingTiers[0]?.minPracticeCount ??
      null,
  );
  readonly bookingTier = computed(() => {
    if (!this.isBookingEnabled()) return undefined;
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

  getPlanDesc(planCode: string): string {
    const isEn = this.language.currentLang() === 'en';
    switch (planCode) {
      case 'STARTER':
        return isEn
          ? 'Best for individual doctors and solo private practices.'
          : 'مثالية للأطباء والعيادات الفردية المستقلة.';
      case 'PROFESSIONAL':
        return isEn
          ? 'Best for growing clinics needing financial insights and report exports.'
          : 'الأفضل للعيادات المتنامية التي تحتاج إدارة المصروفات والتقارير المتقدمة.';
      case 'PREMIUM':
        return isEn
          ? 'Best for medical centers and multi-branch polyclinics.'
          : 'للمراكز الطبية والمجمعات والعيادات المتعددة ذات الفروع.';
      case 'ONLINE_BOOKING_ONLY':
      case 'BOOKING_ONLY':
        return isEn
          ? 'Dedicated for online appointments and public doctor discovery.'
          : 'مخصصة لإدارة الحجوزات والظهور الرقمي لصفحة العيادة.';
      default:
        return isEn
          ? 'Full comprehensive healthcare platform management.'
          : 'إدارة شاملة ومتكاملة لكافة أعمال العيادة والمنظومة الطبية.';
    }
  }

  getBookingFeatures(): string[] {
    const isEn = this.language.currentLang() === 'en';
    return isEn
      ? [
          'Public Doctor Profile & Web Discovery',
          'Online Patient Reservation Booking',
          'Practice Schedule & Working Hours Availability',
          'Appointment Notifications & Management',
          'Practice Branding & Clinic Information',
          'Dedicated Online Booking Dashboard',
        ]
      : [
          'ظهور صفحة الطبيب والحجز الإلكتروني',
          'استقبال وتأكيد حجوزات المرضى أونلاين',
          'تنظيم مواعيد العيادة وساعات العمل',
          'إدارة الحجوزات وإشعارات الحجز المباشرة',
          'هوية العيادة وبيانات التواصل والعنوان',
          'لوحة تحكم مخصصة للحجوزات الإلكترونية',
        ];
  }

  getPlanFeatures(plan: CommercialPlan): string[] {
    const isEn = this.language.currentLang() === 'en';
    if (plan.code === 'STARTER') {
      return isEn
        ? [
            'Full Clinical Visit & Medical Encounter',
            'Electronic Prescriptions & Diagnoses',
            'Patient Medical Records, Labs & Radiology',
            'Queue Management, Check-in & Walk-in',
            'Online Booking & Doctor Discovery',
            'Payment Collection & Financial Summary',
          ]
        : [
            'الزيارة الطبية والكشف السريري المتكامل',
            'الروشتات الإلكترونية والتشخيص الطبي',
            'سجلات المرضى الكاملة، التحاليل والأشعة',
            'التذاكر والطابور والحضور المباشر',
            'الحجز الإلكتروني وظهور الطبيب',
            'تحصيل المدفوعات وإيرادات العيادة',
          ];
    }
    if (plan.code === 'PROFESSIONAL') {
      return isEn
        ? [
            'All Starter features included',
            'Operating Expenses & Salaries Management',
            'Reception Shift Handover',
            'Advanced Operational Reports',
            'Export Reports (PDF / Excel)',
            'Segment Priority & Custom Quotas',
          ]
        : [
            'جميع مميزات الباقة الأساسية',
            'إدارة مصروفات التشغيل ومسير الرواتب',
            'تسليم نوبتجيات الاستقبال (Handover)',
            'تقارير الأداء والتشغيل المتقدمة',
            'تصدير التقارير (PDF و Excel)',
            'أولوية الدخول وحصص الشرائح المتقدمة',
          ];
    }
    if (plan.code === 'PREMIUM') {
      return isEn
        ? [
            'All Professional features included',
            'Cross-Practice & Multi-Branch Comparison',
            'Advanced Rule-Based Operational Insights',
            'Priority Quotas & High-Capacity Workflows',
            'Multi-Doctor & Complex Clinic Governance',
            'Full Enterprise Financial & Operational Analytics',
          ]
        : [
            'جميع مميزات الباقة الاحترافية',
            'مقارنة أداء العيادات والفروع المتعددة',
            'مؤشرات تشغيل متقدمة وقواعد ذكية',
            'أعلى سعة للعيادات وموظفي الاستقبال',
            'حوكمة وإدارة متعددة للأطباء والمراكز',
            'تحليلات تشغيلية ومالية متقدمة وشاملة',
          ];
    }
    return plan.features
      .slice(0, 6)
      .map((f) => (isEn ? f.nameEn || f.nameAr || f.code : f.nameAr || f.nameEn || f.code));
  }

  isSelected(option: { product: { code: string }; plan: { code: string }; cycle: string }): boolean {
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
    if (!this.disabled() && this.isBookingEnabled() && this.bookingProduct() && this.bookingTier())
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
