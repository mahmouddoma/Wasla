import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { CommercialCatalog, SubscriptionSelection, SubscriptionsApi } from '../../../../domains/subscriptions';
import { PlanSelectorComponent } from '../../../subscriptions/components/plan-selector/plan-selector.component';

interface FaqItem {
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  isOpen: boolean;
}

@Component({
  selector: 'app-pricing-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, PlanSelectorComponent],
  templateUrl: './pricing-landing.component.html',
  styleUrl: './pricing-landing.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingLandingComponent {
  readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly api = inject(SubscriptionsApi);

  readonly catalog = signal<CommercialCatalog | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly selection = signal<SubscriptionSelection | null>(null);

  readonly faqs = signal<FaqItem[]>([
    {
      questionAr: 'ما هي مدة التجربة المجانية للأطباء؟',
      questionEn: 'How long is the doctor free trial?',
      answerAr: 'توفر وصلة فترة تجربة مجانية كاملة مدتها 20 يوماً فور اعتماد بيانات الطبيب، تشمل كافة مميزات الباقة الأساسية من كشوفات وروشتات وسجلات مرضى بدون أي رسوم.',
      answerEn: 'Wasla provides a 20-day full free trial upon doctor verification, covering all Starter clinical features including encounters, e-prescriptions, and patient charts with zero fees.',
      isOpen: false,
    },
    {
      questionAr: 'هل أحتاج إلى بطاقة بنكية للاشتراك أو بدء التجربة؟',
      questionEn: 'Do I need a credit card to sign up or start the trial?',
      answerAr: 'لا، المنصة لا تتطلب أي بطاقة ائتمانية. تفعيل الحسابات والتحصيل يتمان بالتنسيق المباشر مع إدارة وصلة وبدون أي خصم مالي تلقائي.',
      answerEn: 'No credit card is required. Account activation and billing are coordinated directly with Wasla administration with zero automatic charges.',
      isOpen: false,
    },
    {
      questionAr: 'هل يمكنني تغيير الباقة أو الترقية في أي وقت؟',
      questionEn: 'Can I upgrade or change my plan anytime?',
      answerAr: 'نعم بكل تأكيد، يمكنك من خلال لوحة تحكم اشتراكك طلب ترقية باقتك أو تعديل دورة الدفع بالتنسيق المباشر مع فريق الدعم والإدارة.',
      answerEn: 'Yes, you can request an upgrade or change your billing cycle anytime directly from your subscription workspace in coordination with our support team.',
      isOpen: false,
    },
    {
      questionAr: 'كيف يستفيد موظف الاستقبال أو مساعد العيادة من المنصة؟',
      questionEn: 'How does clinic reception or staff use the platform?',
      answerAr: 'توفر وصلة شاشات مبسطة وخالية من المصطلحات المعقدة مخصصة لمساعدي الأطباء لإدارة الحضور، تسجيل المرضى، وطباعة التذاكر دون الحاجة لأي خلفية تقنية سابقة.',
      answerEn: 'Wasla offers radically simplified reception workspaces designed for clinic assistants to manage check-ins, queue tickets, and patient intake with zero tech jargon.',
      isOpen: false,
    },
    {
      questionAr: 'هل بيانات المرضى وسجلات العيادة مشفرة وآمنة؟',
      questionEn: 'Are patient medical records encrypted and secure?',
      answerAr: 'نعم، كافة البيانات السريرية والروشتات مشفرة بالكامل ومعزولة وفق أعلى معايير أمان البيانات الصحية HIPAA وحماية الخصوصية.',
      answerEn: 'Yes, all clinical data, encounters, and prescriptions are strictly encrypted and isolated following international healthcare data protection and privacy standards.',
      isOpen: false,
    },
  ]);

  constructor() {
    void this.loadCatalog();
  }

  async loadCatalog(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      const cat = await firstValueFrom(this.api.catalog());
      this.catalog.set(cat);
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  onPlanSelected(selection: SubscriptionSelection): void {
    this.selection.set(selection);
    // Navigate doctor directly to registration step with the chosen plan
    void this.router.navigate(['/register/doctor'], {
      queryParams: {
        plan: selection.planCode,
        cycle: selection.billingCycle,
      },
    });
  }

  toggleFaq(index: number): void {
    this.faqs.update((list) =>
      list.map((item, idx) => ({
        ...item,
        isOpen: idx === index ? !item.isOpen : false,
      })),
    );
  }

  scrollToSection(id: string): void {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

