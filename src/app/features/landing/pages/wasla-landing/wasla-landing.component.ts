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
  EditorialFeatureStory,
  FaqAccordionItem,
  JourneyStage,
  JourneyStageId,
  RoleSummary,
  RoleTabId,
} from '../../models/landing.models';

interface ProblemComparisonRow {
  readonly id: string;
  readonly num: string;
  readonly titleKey: string;
  readonly painKey: string;
  readonly fixKey: string;
}

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

  protected readonly activeJourneyStageId = signal<JourneyStageId>('before');
  protected readonly activeRoleId = signal<RoleTabId>('doctor');
  protected readonly openFaqId = signal<string | null>('faq-1');

  protected readonly catalog = signal<CommercialCatalog | null>(null);
  protected readonly loadingCatalog = signal<boolean>(true);
  protected readonly catalogUnavailable = signal<boolean>(false);
  protected readonly selection = signal<SubscriptionSelection | null>(null);

  protected readonly workspaceRoute = computed(() => {
    const currentUser = this.authSession.user();
    return currentUser ? this.authSession.destinationFor(currentUser) : '/login';
  });

  protected readonly problemItems: readonly ProblemComparisonRow[] = [
    {
      id: 'prob-1',
      num: '01',
      titleKey: 'landing.problem.item1Title',
      painKey: 'landing.problem.item1Pain',
      fixKey: 'landing.problem.item1Fix',
    },
    {
      id: 'prob-2',
      num: '02',
      titleKey: 'landing.problem.item2Title',
      painKey: 'landing.problem.item2Pain',
      fixKey: 'landing.problem.item2Fix',
    },
    {
      id: 'prob-3',
      num: '03',
      titleKey: 'landing.problem.item3Title',
      painKey: 'landing.problem.item3Pain',
      fixKey: 'landing.problem.item3Fix',
    },
    {
      id: 'prob-4',
      num: '04',
      titleKey: 'landing.problem.item4Title',
      painKey: 'landing.problem.item4Pain',
      fixKey: 'landing.problem.item4Fix',
    },
    {
      id: 'prob-5',
      num: '05',
      titleKey: 'landing.problem.item5Title',
      painKey: 'landing.problem.item5Pain',
      fixKey: 'landing.problem.item5Fix',
    },
  ];

  protected readonly journeyStages: readonly JourneyStage[] = [
    {
      id: 'before',
      numKey: 'landing.journey.stage1Num',
      tabKey: 'landing.journey.stage1Tab',
      titleKey: 'landing.journey.stage1Title',
      descKey: 'landing.journey.stage1Desc',
      bulletKeys: [
        'landing.journey.stage1Bullet1',
        'landing.journey.stage1Bullet2',
        'landing.journey.stage1Bullet3',
      ],
      mockCardTitleKey: 'landing.journey.mockStage1Card',
      mockItems: [
        { code: '01', labelKey: 'landing.journey.mockStage1Item1' },
        { code: '02', labelKey: 'landing.journey.mockStage1Item2' },
        { code: '03', labelKey: 'landing.journey.mockStage1Item3' },
      ],
    },
    {
      id: 'during',
      numKey: 'landing.journey.stage2Num',
      tabKey: 'landing.journey.stage2Tab',
      titleKey: 'landing.journey.stage2Title',
      descKey: 'landing.journey.stage2Desc',
      bulletKeys: [
        'landing.journey.stage2Bullet1',
        'landing.journey.stage2Bullet2',
        'landing.journey.stage2Bullet3',
      ],
      mockCardTitleKey: 'landing.journey.mockStage2Card',
      mockItems: [
        { code: '01', labelKey: 'landing.journey.mockStage2Item1' },
        { code: '02', labelKey: 'landing.journey.mockStage2Item2' },
        { code: '03', labelKey: 'landing.journey.mockStage2Item3' },
      ],
    },
    {
      id: 'after',
      numKey: 'landing.journey.stage3Num',
      tabKey: 'landing.journey.stage3Tab',
      titleKey: 'landing.journey.stage3Title',
      descKey: 'landing.journey.stage3Desc',
      bulletKeys: [
        'landing.journey.stage3Bullet1',
        'landing.journey.stage3Bullet2',
        'landing.journey.stage3Bullet3',
      ],
      mockCardTitleKey: 'landing.journey.mockStage3Card',
      mockItems: [
        { code: '01', labelKey: 'landing.journey.mockStage3Item1' },
        { code: '02', labelKey: 'landing.journey.mockStage3Item2' },
        { code: '03', labelKey: 'landing.journey.mockStage3Item3' },
      ],
    },
  ];

  protected readonly activeJourneyStage = computed(
    () =>
      this.journeyStages.find((stage) => stage.id === this.activeJourneyStageId()) ??
      this.journeyStages[0],
  );

  protected readonly featureStories: readonly EditorialFeatureStory[] = [
    {
      id: 'feat-queue',
      tagKey: 'landing.feat1.tag',
      titleKey: 'landing.feat1.title',
      problemKey: 'landing.feat1.problem',
      solutionKey: 'landing.feat1.solution',
      outcomeKey: 'landing.feat1.outcome',
      previewTitleKey: 'landing.feat1.previewTitle',
      previewRowKeys: [
        'landing.feat1.previewRow1',
        'landing.feat1.previewRow2',
        'landing.feat1.previewRow3',
      ],
      iconClass: 'fa-solid fa-calendar-check',
      reversed: false,
    },
    {
      id: 'feat-reception',
      tagKey: 'landing.feat2.tag',
      titleKey: 'landing.feat2.title',
      problemKey: 'landing.feat2.problem',
      solutionKey: 'landing.feat2.solution',
      outcomeKey: 'landing.feat2.outcome',
      previewTitleKey: 'landing.feat2.previewTitle',
      previewRowKeys: [
        'landing.feat2.previewRow1',
        'landing.feat2.previewRow2',
        'landing.feat2.previewRow3',
      ],
      iconClass: 'fa-solid fa-hospital-user',
      reversed: true,
    },
    {
      id: 'feat-emr',
      tagKey: 'landing.feat3.tag',
      titleKey: 'landing.feat3.title',
      problemKey: 'landing.feat3.problem',
      solutionKey: 'landing.feat3.solution',
      outcomeKey: 'landing.feat3.outcome',
      previewTitleKey: 'landing.feat3.previewTitle',
      previewRowKeys: [
        'landing.feat3.previewRow1',
        'landing.feat3.previewRow2',
        'landing.feat3.previewRow3',
      ],
      iconClass: 'fa-solid fa-file-medical',
      reversed: false,
    },
    {
      id: 'feat-finance',
      tagKey: 'landing.feat4.tag',
      titleKey: 'landing.feat4.title',
      problemKey: 'landing.feat4.problem',
      solutionKey: 'landing.feat4.solution',
      outcomeKey: 'landing.feat4.outcome',
      previewTitleKey: 'landing.feat4.previewTitle',
      previewRowKeys: [
        'landing.feat4.previewRow1',
        'landing.feat4.previewRow2',
        'landing.feat4.previewRow3',
      ],
      iconClass: 'fa-solid fa-chart-pie',
      reversed: true,
    },
  ];

  protected readonly roleSummaries: readonly RoleSummary[] = [
    {
      id: 'doctor',
      titleKey: 'landing.roles.doctor.title',
      badgeKey: 'landing.roles.doctor.badge',
      scopeKey: 'landing.roles.doctor.scope',
      pointKeys: [
        'landing.roles.doctor.p1',
        'landing.roles.doctor.p2',
        'landing.roles.doctor.p3',
      ],
      iconClass: 'fa-solid fa-user-doctor',
    },
    {
      id: 'reception',
      titleKey: 'landing.roles.reception.title',
      badgeKey: 'landing.roles.reception.badge',
      scopeKey: 'landing.roles.reception.scope',
      pointKeys: [
        'landing.roles.reception.p1',
        'landing.roles.reception.p2',
        'landing.roles.reception.p3',
      ],
      iconClass: 'fa-solid fa-headset',
    },
    {
      id: 'patient',
      titleKey: 'landing.roles.patient.title',
      badgeKey: 'landing.roles.patient.badge',
      scopeKey: 'landing.roles.patient.scope',
      pointKeys: [
        'landing.roles.patient.p1',
        'landing.roles.patient.p2',
        'landing.roles.patient.p3',
      ],
      iconClass: 'fa-solid fa-heart-pulse',
    },
  ];

  protected readonly activeRole = computed(
    () =>
      this.roleSummaries.find((role) => role.id === this.activeRoleId()) ??
      this.roleSummaries[0],
  );

  protected readonly faqItems: readonly FaqAccordionItem[] = [
    { id: 'faq-1', questionKey: 'landing.faq.q1', answerKey: 'landing.faq.a1' },
    { id: 'faq-2', questionKey: 'landing.faq.q2', answerKey: 'landing.faq.a2' },
    { id: 'faq-3', questionKey: 'landing.faq.q3', answerKey: 'landing.faq.a3' },
    { id: 'faq-4', questionKey: 'landing.faq.q4', answerKey: 'landing.faq.a4' },
    { id: 'faq-5', questionKey: 'landing.faq.q5', answerKey: 'landing.faq.a5' },
    { id: 'faq-6', questionKey: 'landing.faq.q6', answerKey: 'landing.faq.a6' },
  ];

  constructor() {
    void this.loadPricingCatalog();

    afterNextRender(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
      this.initLandingAnimations();
    });

    this.destroyRef.onDestroy(() => {
      this.sectionObserver?.disconnect();
      this.sectionObserver = null;
      const root = this.elementRef.nativeElement;
      const animatedNodes = root.querySelectorAll(
        '.hero-eyebrow-pill, .hero-headline, .hero-lead, .hero-cta-row, .hero-meta-links, .hero-visual-col, ' +
          '#problem-section .ledger-row, #clinic-journey .journey-tab-btn, .journey-stage-panel, ' +
          '#features .story-block, #roles-overview .role-tab-card, .role-detail-panel, ' +
          '#faq-section .faq-row, .faq-answer, .final-cta-box',
      );
      if (animatedNodes.length) {
        gsap.killTweensOf(animatedNodes);
      }
    });
  }

  protected selectJourneyStage(id: JourneyStageId): void {
    this.activeJourneyStageId.set(id);
    this.animatePanelReveal('.journey-stage-panel', 12);
  }

  protected selectRole(id: RoleTabId): void {
    this.activeRoleId.set(id);
    this.animatePanelReveal('.role-detail-panel', 12);
  }

  protected toggleFaq(id: string): void {
    const opening = this.openFaqId() !== id;
    this.openFaqId.update((current) => (current === id ? null : id));
    if (opening) {
      this.animatePanelReveal('.faq-row.is-open .faq-answer', 8, 0.24);
    }
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    );
  }

  private animatePanelReveal(selector: string, yOffset = 10, duration = 0.28): void {
    if (this.prefersReducedMotion()) return;
    queueMicrotask(() => {
      const target = this.elementRef.nativeElement.querySelector(selector);
      if (!target) return;
      gsap.fromTo(
        target,
        { opacity: 0, y: yOffset },
        { opacity: 1, y: 0, duration, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform,opacity' },
      );
    });
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
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.06,
          ease: 'power2.out',
          overwrite: 'auto',
          clearProps: 'transform,opacity',
        },
      );
    }

    if (!('IntersectionObserver' in window)) return;

    const sectionGroups = [
      { targetId: 'problem-section', itemSelector: '#problem-section .ledger-row', stagger: 0.06 },
      { targetId: 'clinic-journey', itemSelector: '#clinic-journey .journey-tab-btn', stagger: 0.07 },
      { targetId: 'features', itemSelector: '#features .story-block', stagger: 0.09 },
      { targetId: 'roles-overview', itemSelector: '#roles-overview .role-tab-card', stagger: 0.07 },
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
            { opacity: 0.92, y: 18 },
            {
              opacity: 1,
              y: 0,
              duration: 0.45,
              stagger: config.stagger,
              ease: 'power2.out',
              overwrite: 'auto',
              clearProps: 'transform,opacity',
            },
          );
        }
      },
      { threshold: 0.12 },
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
        plan: selection.planCode,
        cycle: selection.billingCycle,
      },
    });
  }

  protected async loadPricingCatalog(): Promise<void> {
    this.loadingCatalog.set(true);
    this.catalogUnavailable.set(false);
    try {
      const cat = await firstValueFrom(this.subscriptionsApi.catalog());
      this.catalog.set(cat);
    } catch {
      this.catalogUnavailable.set(true);
    } finally {
      this.loadingCatalog.set(false);
    }
  }
}
