import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import gsap from 'gsap';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { CommercialCatalog, SubscriptionSelection, SubscriptionsApi } from '../../../../domains/subscriptions';
import { AppHeader } from '../../../../shared/components/app-header/app-header';
import { PlanSelectorComponent } from '../../../subscriptions';

interface FaqItem {
  questionKey: string;
  answerKey: string;
  isOpen: boolean;
}

@Component({
  selector: 'app-pricing-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe, AppHeader, PlanSelectorComponent],
  templateUrl: './pricing-landing.component.html',
  styleUrl: './pricing-landing.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingLandingComponent {
  readonly language = inject(LanguageService);
  readonly authSession = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly api = inject(SubscriptionsApi);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private observer: IntersectionObserver | null = null;

  readonly catalog = signal<CommercialCatalog | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly selection = signal<SubscriptionSelection | null>(null);

  readonly faqs = signal<FaqItem[]>([
    { questionKey: 'pricing.faqs.q1', answerKey: 'pricing.faqs.a1', isOpen: false },
    { questionKey: 'pricing.faqs.q2', answerKey: 'pricing.faqs.a2', isOpen: false },
    { questionKey: 'pricing.faqs.q3', answerKey: 'pricing.faqs.a3', isOpen: false },
    { questionKey: 'pricing.faqs.q4', answerKey: 'pricing.faqs.a4', isOpen: false },
    { questionKey: 'pricing.faqs.q5', answerKey: 'pricing.faqs.a5', isOpen: false },
  ]);

  constructor() {
    afterNextRender(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
      this.animateHero();
      this.setupScrollReveals();
    });
    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      const host = this.hostRef.nativeElement;
      gsap.killTweensOf(host.querySelectorAll('.hero-stagger, .hero-reassurance-row, .pillar-card, .faq-accordion-item, .cta-inner-container, .faq-answer-pane'));
    });
    void this.loadCatalog();
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window === 'undefined' ||
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    );
  }

  private animateHero(): void {
    if (this.prefersReducedMotion()) return;
    const host = this.hostRef.nativeElement;
    const heroTargets = host.querySelectorAll('.hero-stagger, .hero-reassurance-row');
    if (!heroTargets.length) return;
    gsap.fromTo(
      heroTargets,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform,opacity' },
    );
  }

  private setupScrollReveals(): void {
    if (this.prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
    const host = this.hostRef.nativeElement;
    const targets: Array<{ el: Element; selector: string }> = [
      { el: host.querySelector('#why-wasla')!, selector: '.pillar-card' },
      { el: host.querySelector('#faq')!, selector: '.faq-accordion-item' },
      { el: host.querySelector('.landing-bottom-cta')!, selector: '.cta-inner-container' },
    ].filter((entry) => Boolean(entry.el));

    if (!targets.length) return;
    const revealed = new WeakSet<Element>();
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || revealed.has(entry.target)) continue;
          revealed.add(entry.target);
          this.observer?.unobserve(entry.target);
          const match = targets.find((t) => t.el === entry.target);
          if (!match) continue;
          const children = entry.target.querySelectorAll(match.selector);
          if (!children.length) continue;
          gsap.fromTo(
            children,
            { y: 18, opacity: 0.92 },
            { y: 0, opacity: 1, duration: 0.5, stagger: 0.07, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform,opacity' },
          );
        }
      },
      { threshold: 0.12 },
    );
    for (const target of targets) {
      this.observer.observe(target.el);
    }
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

  logout(): void {
    this.authSession.clear();
    void this.router.navigate(['/login']);
  }

  toggleFaq(index: number): void {
    this.faqs.update((list) =>
      list.map((item, idx) => ({
        ...item,
        isOpen: idx === index ? !item.isOpen : false,
      })),
    );
    if (!this.prefersReducedMotion()) {
      queueMicrotask(() => {
        const panes = this.hostRef.nativeElement.querySelectorAll('.faq-answer-pane');
        if (panes.length) {
          gsap.fromTo(
            panes,
            { y: -6, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform,opacity' },
          );
        }
      });
    }
  }

  scrollToSection(id: string): void {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

