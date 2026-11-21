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
import { LandingNavbarComponent } from '../../components/landing-navbar/landing-navbar.component';
import { LandingInteractiveDemoComponent } from '../../components/landing-interactive-demo/landing-interactive-demo.component';
import {
  FaqAccordionItem,
  WhyWaslaBenefit,
} from '../../models/landing.models';

@Component({
  selector: 'app-wasla-landing',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    LandingNavbarComponent,
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
  private heroVideoObserver: IntersectionObserver | null = null;
  private pausedByViewport = false;

  protected readonly openFaqId = signal<string | null>('faq-1');
  protected readonly introMuted = signal<boolean>(true);
  protected readonly introEnded = signal<boolean>(false);
  protected readonly introVideoFailed = signal<boolean>(false);
  protected readonly introReducedMotion = signal<boolean>(false);
  protected readonly introAutoplayBlocked = signal<boolean>(false);

  protected toggleIntroSound(video: HTMLVideoElement): void {
    const nextMuted = !this.introMuted();
    this.introMuted.set(nextMuted);
    video.muted = nextMuted;
    if (!nextMuted && (video.ended || video.paused)) {
      video.currentTime = 0;
      this.introEnded.set(false);
      this.introAutoplayBlocked.set(false);
      void video.play().catch(() => undefined);
    }
  }

  protected replayIntro(video: HTMLVideoElement): void {
    this.introEnded.set(false);
    this.introAutoplayBlocked.set(false);
    this.pausedByViewport = false;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }

  protected onIntroPlay(): void {
    this.introAutoplayBlocked.set(false);
    this.introEnded.set(false);
  }

  protected onIntroEnded(): void {
    this.introEnded.set(true);
    this.pausedByViewport = false;
  }

  protected onIntroError(): void {
    this.introVideoFailed.set(true);
  }

  protected readonly catalog = signal<CommercialCatalog | null>(null);
  protected readonly loadingCatalog = signal<boolean>(true);
  protected readonly catalogUnavailable = signal<boolean>(false);
  protected readonly selection = signal<SubscriptionSelection | null>(null);

  protected readonly workspaceRoute = computed(() => {
    const currentUser = this.authSession.user();
    return currentUser ? this.authSession.destinationFor(currentUser) : '/login';
  });

  protected readonly mainBenefits: readonly WhyWaslaBenefit[] = [
    {
      id: 'benefit-scheduling',
      iconClass: 'fa-regular fa-calendar-check',
      titleKey: 'landing.benefits.b1Title',
      descKey: 'landing.benefits.b1Desc',
    },
    {
      id: 'benefit-queue',
      iconClass: 'fa-solid fa-users',
      titleKey: 'landing.benefits.b2Title',
      descKey: 'landing.benefits.b2Desc',
    },
    {
      id: 'benefit-records',
      iconClass: 'fa-solid fa-clipboard-list',
      titleKey: 'landing.benefits.b3Title',
      descKey: 'landing.benefits.b3Desc',
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
      questionKey: 'landing.faq.q3',
      answerKey: 'landing.faq.a3',
    },
  ];

  constructor() {
    afterNextRender(() => {
      this.initHeroVideo();
      this.initLandingAnimations();
    });

    this.destroyRef.onDestroy(() => {
      this.sectionObserver?.disconnect();
      this.heroVideoObserver?.disconnect();
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

  private initHeroVideo(): void {
    if (this.prefersReducedMotion()) {
      this.introReducedMotion.set(true);
      return;
    }

    const root = this.elementRef.nativeElement;
    const video = root.querySelector<HTMLVideoElement>('#hero-brand-video');
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;

    const tryAutoplay = () => {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          this.introAutoplayBlocked.set(true);
        });
      }
    };

    tryAutoplay();
    video.addEventListener('canplay', tryAutoplay, { once: true });

    const heroSection = root.querySelector<HTMLElement>('.hero-section');
    if (heroSection && 'IntersectionObserver' in window) {
      this.heroVideoObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          if (!entry.isIntersecting) {
            if (!video.paused) {
              video.pause();
              this.pausedByViewport = true;
            }
          } else if (this.pausedByViewport) {
            this.pausedByViewport = false;
            void video.play().catch(() => undefined);
          }
        },
        { threshold: 0.15 },
      );
      this.heroVideoObserver.observe(heroSection);
    }
  }

  private initLandingAnimations(): void {
    if (this.prefersReducedMotion()) return;

    const root = this.elementRef.nativeElement;
    const heroTargets = root.querySelectorAll(
      '.hero-headline, .hero-lead, .hero-cta-row',
    );
    if (heroTargets.length) {
      gsap.fromTo(
        heroTargets,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.05,
          ease: 'power2.out',
          overwrite: 'auto',
          clearProps: 'transform,opacity',
        },
      );
    }

    if (!('IntersectionObserver' in window)) return;

    const sectionGroups = [
      { targetId: 'benefits-section', itemSelector: '#benefits-section .benefit-item', stagger: 0.08 },
      { targetId: 'pricing-section', itemSelector: '#pricing-section .pricing-card', stagger: 0.08 },
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

  protected selectPlan(planCode: string): void {
    void this.router.navigate(['/register/doctor'], {
      queryParams: {
        plan: planCode,
        cycle: 'Monthly',
      },
    });
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
