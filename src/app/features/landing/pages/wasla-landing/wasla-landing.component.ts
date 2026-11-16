import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import gsap from 'gsap';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import {
  CommercialCatalog,
  SubscriptionSelection,
  SubscriptionsApi,
} from '../../../../domains/subscriptions';
import { PlanSelectorComponent } from '../../../subscriptions';
import { LandingHeroPreviewComponent } from '../../components/landing-hero-preview/landing-hero-preview.component';
import { LandingInteractiveDemoComponent } from '../../components/landing-interactive-demo/landing-interactive-demo.component';
import { AppHeader } from '../../../../shared/components/app-header/app-header';
import {
  FaqAccordionItem,
  HowItWorksStep,
  WhyWaslaBenefit,
} from '../../models/landing.models';

@Component({
  selector: 'app-wasla-landing',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    AppHeader,
    LandingHeroPreviewComponent,
    LandingInteractiveDemoComponent,
    PlanSelectorComponent,
  ],
  templateUrl: './wasla-landing.component.html',
  styleUrl: './wasla-landing.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaslaLandingComponent {
  protected readonly language = inject(LanguageService);
  protected readonly authSession = inject(AuthSession);
  private readonly subscriptionsApi = inject(SubscriptionsApi);
  private readonly router = inject(Router);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private sectionObserver: IntersectionObserver | null = null;

  protected readonly openFaqId = signal<string | null>('faq-1');

  protected readonly catalog = signal<CommercialCatalog | null>(null);
  protected readonly loadingCatalog = signal<boolean>(true);
  protected readonly catalogUnavailable = signal<boolean>(false);
  protected readonly selection = signal<SubscriptionSelection | null>(null);

  protected readonly workspaceRoute = computed(() => {
    const currentUser = this.authSession.user();
    return currentUser ? this.authSession.destinationFor(currentUser) : '/login';
  });

  protected readonly whyWaslaBenefits: readonly WhyWaslaBenefit[] = [
    {
      id: 'benefit-scheduling',
      iconClass: 'fa-solid fa-calendar-check',
      titleKey: 'landing.why.b1Title',
      descKey: 'landing.why.b1Desc',
    },
    {
      id: 'benefit-records',
      iconClass: 'fa-solid fa-folder-medical',
      titleKey: 'landing.why.b2Title',
      descKey: 'landing.why.b2Desc',
    },
    {
      id: 'benefit-operations',
      iconClass: 'fa-solid fa-list-check',
      titleKey: 'landing.why.b3Title',
      descKey: 'landing.why.b3Desc',
    },
  ];

  protected readonly howItWorksSteps: readonly HowItWorksStep[] = [
    {
      num: '01',
      iconClass: 'fa-solid fa-calendar-plus',
      titleKey: 'landing.steps.s1Title',
      descKey: 'landing.steps.s1Desc',
      actionKey: 'landing.steps.s1Action',
      outcomeKey: 'landing.steps.s1Outcome',
    },
    {
      num: '02',
      iconClass: 'fa-solid fa-users-line',
      titleKey: 'landing.steps.s2Title',
      descKey: 'landing.steps.s2Desc',
      actionKey: 'landing.steps.s2Action',
      outcomeKey: 'landing.steps.s2Outcome',
    },
    {
      num: '03',
      iconClass: 'fa-solid fa-prescription-bottle-medical',
      titleKey: 'landing.steps.s3Title',
      descKey: 'landing.steps.s3Desc',
      actionKey: 'landing.steps.s3Action',
      outcomeKey: 'landing.steps.s3Outcome',
    },
  ];

  protected readonly faqItems: readonly FaqAccordionItem[] = [
    {
      id: 'faq-1',
      questionKey: 'landing.faq.q1',
      answerKey: 'landing.faq.a1',
    },
    {
      id: 'faq-2',
      questionKey: 'landing.faq.q2',
      answerKey: 'landing.faq.a2',
    },
    {
      id: 'faq-3',
      questionKey: 'landing.faq.q5',
      answerKey: 'landing.faq.a5',
    },
    {
      id: 'faq-4',
      questionKey: 'landing.faq.q6',
      answerKey: 'landing.faq.a6',
    },
  ];

  constructor() {
    afterNextRender(() => {
      this.initLandingAnimations();
    });

    this.destroyRef.onDestroy(() => {
      this.sectionObserver?.disconnect();
    });

    void this.loadCatalog();
  }

  protected toggleFaq(id: string): void {
    this.openFaqId.update((current) => (current === id ? null : id));
  }

  protected async loadPricingCatalog(): Promise<void> {
    await this.loadCatalog();
  }

  private async loadCatalog(): Promise<void> {
    try {
      this.loadingCatalog.set(true);
      this.catalogUnavailable.set(false);
      const data = await firstValueFrom(this.subscriptionsApi.catalog());
      this.catalog.set(data);
    } catch {
      this.catalogUnavailable.set(true);
      this.catalog.set(null);
    } finally {
      this.loadingCatalog.set(false);
    }
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    );
  }

  private initLandingAnimations(): void {
    if (this.prefersReducedMotion()) return;

    const root = this.elementRef.nativeElement;
    const heroTargets = root.querySelectorAll(
      '.hero-eyebrow-pill, .hero-headline, .hero-lead, .hero-cta-row, .hero-meta-links, .hero-visual-col',
    );
    if (heroTargets.length) {
      gsap.fromTo(
        heroTargets,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.05,
          ease: 'power2.out',
          overwrite: 'auto',
          clearProps: 'transform,opacity',
        },
      );
    }

    if (!('IntersectionObserver' in window)) return;

    const sectionGroups = [
      { targetId: 'why-wasla', itemSelector: '#why-wasla .benefit-item', stagger: 0.08 },
      { targetId: 'clinic-journey', itemSelector: '#clinic-journey .process-step-item', stagger: 0.08 },
      { targetId: 'faq-section', itemSelector: '#faq-section .faq-row', stagger: 0.05 },
    ] as const;

    const revealGroupsByElement = new Map<
      Element,
      { readonly itemSelector: string; readonly stagger: number }
    >();

    for (const group of sectionGroups) {
      const container = root.querySelector(`#${group.targetId}`);
      if (container) {
        revealGroupsByElement.set(container, {
          itemSelector: group.itemSelector,
          stagger: group.stagger,
        });
      }
    }

    const finalCtaBox = root.querySelector('.final-cta-box');
    if (finalCtaBox) {
      revealGroupsByElement.set(finalCtaBox, { itemSelector: '.final-cta-box', stagger: 0 });
    }

    if (revealGroupsByElement.size === 0) return;

    this.sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const config = revealGroupsByElement.get(entry.target);
          this.sectionObserver?.unobserve(entry.target);
          if (!config) continue;

          const items = root.querySelectorAll(config.itemSelector);
          if (!items.length) continue;

          gsap.fromTo(
            items,
            { opacity: 0.9, y: 16 },
            {
              opacity: 1,
              y: 0,
              duration: 0.4,
              stagger: config.stagger,
              ease: 'power2.out',
              overwrite: 'auto',
              clearProps: 'transform,opacity',
            },
          );
        }
      },
      { threshold: 0.1 },
    );

    for (const element of revealGroupsByElement.keys()) {
      this.sectionObserver.observe(element);
    }
  }

  protected logout(): void {
    this.authSession.clear();
    void this.router.navigate(['/login']);
  }

  protected scrollToSection(sectionId: string): void {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  protected onPlanSelected(selection: SubscriptionSelection): void {
    this.selection.set(selection);
    void this.router.navigate(['/register/doctor'], {
      queryParams: {
        product: selection.productCode,
        plan: selection.planCode,
        cycle: selection.billingCycle,
      },
    });
  }
}
