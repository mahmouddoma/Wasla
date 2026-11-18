import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
} from '@angular/core';
import gsap from 'gsap';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';

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
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (this.prefersReducedMotion()) return;
      const root = this.elementRef.nativeElement;
      const windowEl = root.querySelector('.hero-preview-window');
      const kpis = root.querySelectorAll('.preview-kpi-chip');
      const tableRows = root.querySelectorAll('.hero-preview-table tbody tr');

      if (windowEl) {
        gsap.fromTo(
          windowEl,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', clearProps: 'transform,opacity' },
        );
      }
      if (kpis.length) {
        gsap.fromTo(
          kpis,
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            stagger: 0.05,
            delay: 0.1,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          },
        );
      }
      if (tableRows.length) {
        gsap.fromTo(
          tableRows,
          { opacity: 0, x: this.language.dir() === 'rtl' ? -8 : 8 },
          {
            opacity: 1,
            x: 0,
            duration: 0.3,
            stagger: 0.04,
            delay: 0.2,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          },
        );
      }
    });

    this.destroyRef.onDestroy(() => {
      const nodes = this.elementRef.nativeElement.querySelectorAll(
        '.hero-preview-window, .preview-kpi-chip, .hero-preview-table tbody tr',
      );
      if (nodes.length) {
        gsap.killTweensOf(nodes);
      }
    });
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    );
  }
}
