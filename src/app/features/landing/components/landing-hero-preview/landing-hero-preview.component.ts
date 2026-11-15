import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import gsap from 'gsap';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { HeroPreviewTab } from '../../models/landing.models';

@Component({
  selector: 'app-landing-hero-preview',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './landing-hero-preview.component.html',
  styleUrl: './landing-hero-preview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingHeroPreviewComponent {
  protected readonly language = inject(LanguageService);
  protected readonly activeTab = signal<HeroPreviewTab>('dashboard');
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (this.prefersReducedMotion()) return;
      const root = this.elementRef.nativeElement;
      const frame = root.querySelector('.hero-product-frame');
      const kpis = root.querySelectorAll('.preview-kpi');
      if (frame) {
        gsap.fromTo(
          frame,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', clearProps: 'transform,opacity' },
        );
      }
      if (kpis.length) {
        gsap.fromTo(
          kpis,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.36,
            stagger: 0.05,
            delay: 0.12,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          },
        );
      }
    });

    this.destroyRef.onDestroy(() => {
      const nodes = this.elementRef.nativeElement.querySelectorAll(
        '.hero-product-frame, .preview-kpi, .frame-body',
      );
      if (nodes.length) {
        gsap.killTweensOf(nodes);
      }
    });
  }

  protected selectTab(tab: HeroPreviewTab): void {
    this.activeTab.set(tab);
    if (this.prefersReducedMotion()) return;
    queueMicrotask(() => {
      const body = this.elementRef.nativeElement.querySelector('.frame-body');
      if (!body) return;
      gsap.fromTo(
        body,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out', clearProps: 'transform,opacity' },
      );
    });
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    );
  }
}
