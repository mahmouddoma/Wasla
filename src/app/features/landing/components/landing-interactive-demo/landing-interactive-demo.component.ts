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
import gsap from 'gsap';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { DemoModeId, DemoQueueTicket } from '../../models/landing.models';

const INITIAL_QUEUE: readonly DemoQueueTicket[] = [
  {
    id: 'q-14',
    ticketNumber: 14,
    patientNameKey: 'landing.preview.row1Name',
    visitTypeKey: 'landing.preview.row1Type',
    state: 'serving',
  },
  {
    id: 'q-15',
    ticketNumber: 15,
    patientNameKey: 'landing.preview.row2Name',
    visitTypeKey: 'landing.preview.row2Type',
    state: 'waiting',
  },
  {
    id: 'q-16',
    ticketNumber: 16,
    patientNameKey: 'landing.preview.row3Name',
    visitTypeKey: 'landing.preview.row3Type',
    state: 'waiting',
  },
  {
    id: 'q-17',
    ticketNumber: 17,
    patientNameKey: 'landing.demo.pat4Name',
    visitTypeKey: 'landing.demo.pat4Type',
    state: 'waiting',
  },
];

@Component({
  selector: 'app-landing-interactive-demo',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './landing-interactive-demo.component.html',
  styleUrl: './landing-interactive-demo.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingInteractiveDemoComponent {
  protected readonly language = inject(LanguageService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (typeof window !== 'undefined' && !this.prefersReducedMotion()) {
        const root = this.elementRef.nativeElement;
        const targets = root.querySelectorAll('.showcase-tabs-bar, .browser-mockup-frame, .showcase-info-col');
        if (targets.length) {
          gsap.fromTo(targets, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out' });
        }
      }
    });

    this.destroyRef.onDestroy(() => {
      const nodes = this.elementRef.nativeElement.querySelectorAll('.real-showcase-image, .browser-mockup-frame');
      if (nodes.length) {
        gsap.killTweensOf(nodes);
      }
    });
  }

  protected readonly activeMode = signal<DemoModeId>('appointments');
  protected readonly queueTickets = signal<readonly DemoQueueTicket[]>(INITIAL_QUEUE);

  protected readonly servingTicket = computed(() => {
    return this.queueTickets().find((t) => t.state === 'serving') ?? this.queueTickets()[0];
  });

  protected readonly showcaseScreens = {
    appointments: {
      image: '/showcase/showcase-appointments.png',
      routePath: 'doctor/reservations',
      headingKey: 'landing.showcase.apptsTitle',
      subKey: 'landing.showcase.apptsSub',
      f1Key: 'landing.showcase.apptsPoint1',
      f2Key: 'landing.showcase.apptsPoint2',
      f3Key: 'landing.showcase.apptsPoint3',
      icon: 'fa-regular fa-calendar-check',
    },
    queue: {
      image: '/showcase/showcase-queue.png',
      routePath: 'doctor/queue',
      headingKey: 'landing.showcase.queueTitle',
      subKey: 'landing.showcase.queueSub',
      f1Key: 'landing.showcase.queuePoint1',
      f2Key: 'landing.showcase.queuePoint2',
      f3Key: 'landing.showcase.queuePoint3',
      icon: 'fa-solid fa-users',
    },
    clinical: {
      image: '/showcase/showcase-patients.png',
      routePath: 'doctor/patients',
      headingKey: 'landing.showcase.clinicalTitle',
      subKey: 'landing.showcase.clinicalSub',
      f1Key: 'landing.showcase.clinicalPoint1',
      f2Key: 'landing.showcase.clinicalPoint2',
      f3Key: 'landing.showcase.clinicalPoint3',
      icon: 'fa-solid fa-stethoscope',
    },
    finance: {
      image: '/showcase/showcase-finance.png',
      routePath: 'doctor/finance',
      headingKey: 'landing.showcase.financeTitle',
      subKey: 'landing.showcase.financeSub',
      f1Key: 'landing.showcase.financePoint1',
      f2Key: 'landing.showcase.financePoint2',
      f3Key: 'landing.showcase.financePoint3',
      icon: 'fa-solid fa-wallet',
    },
  } as const;

  protected readonly currentScreen = computed(() => {
    return this.showcaseScreens[this.activeMode()] || this.showcaseScreens.appointments;
  });

  setMode(mode: DemoModeId): void {
    this.activeMode.set(mode);
    if (typeof window !== 'undefined' && !this.prefersReducedMotion()) {
      const img = this.elementRef.nativeElement.querySelector('.real-showcase-image');
      if (img) {
        gsap.fromTo(img, { opacity: 0.35, scale: 0.985 }, { opacity: 1, scale: 1, duration: 0.32, ease: 'power2.out' });
      }
    }
  }

  callNextTicket(): void {
    const list = this.queueTickets();
    const servingIdx = list.findIndex((t) => t.state === 'serving');
    if (servingIdx >= 0 && servingIdx + 1 < list.length) {
      const updated = list.map((t, idx) => {
        if (idx === servingIdx) return { ...t, state: 'done' as const };
        if (idx === servingIdx + 1) return { ...t, state: 'serving' as const };
        return t;
      });
      this.queueTickets.set(updated);
    }
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    );
  }
}
