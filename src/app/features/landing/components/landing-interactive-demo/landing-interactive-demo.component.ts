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
import {
  ClinicalSubTabId,
  DemoAppointment,
  DemoModeId,
  DemoQueueTicket,
} from '../../models/landing.models';

type FinanceBranchId = 'all' | 'maadi' | 'nasr';

interface FinanceSummaryView {
  readonly branchNameKey: string;
  readonly visitsCount: number;
  readonly revenueAmount: string;
  readonly expenseAmount: string;
}

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
    afterNextRender(() => this.animateTargets('.demo-workbench', 14, 0.42));

    this.destroyRef.onDestroy(() => {
      const nodes = this.elementRef.nativeElement.querySelectorAll(
        '.demo-workbench, .demo-stage-surface, .apt-inspector-pane, .serving-banner, .queue-sim-row',
      );
      if (nodes.length) {
        gsap.killTweensOf(nodes);
      }
    });
  }

  protected readonly activeMode = signal<DemoModeId>('appointments');
  protected readonly selectedAppointmentId = signal<string>('apt-3');
  protected readonly queueTickets = signal<readonly DemoQueueTicket[]>(INITIAL_QUEUE);
  protected readonly clinicalTab = signal<ClinicalSubTabId>('notes');
  protected readonly financeBranch = signal<FinanceBranchId>('all');

  protected readonly appointments: readonly DemoAppointment[] = [
    {
      id: 'apt-1',
      ticketNumber: 18,
      timeDisplay: '18:00',
      patientNameKey: 'landing.demo.pat4Name',
      visitTypeKey: 'landing.demo.pat4Type',
      stageKey: 'landing.demo.stageBooked',
      stageTone: 'neutral',
      doctorViewKey: 'landing.demo.apt1Doc',
      receptionViewKey: 'landing.demo.apt1Rec',
      patientViewKey: 'landing.demo.apt1Pat',
    },
    {
      id: 'apt-2',
      ticketNumber: 15,
      timeDisplay: '17:20',
      patientNameKey: 'landing.preview.row2Name',
      visitTypeKey: 'landing.preview.row2Type',
      stageKey: 'landing.demo.stageCheckedIn',
      stageTone: 'teal',
      doctorViewKey: 'landing.demo.apt2Doc',
      receptionViewKey: 'landing.demo.apt2Rec',
      patientViewKey: 'landing.demo.apt2Pat',
    },
    {
      id: 'apt-3',
      ticketNumber: 14,
      timeDisplay: '17:00',
      patientNameKey: 'landing.preview.row1Name',
      visitTypeKey: 'landing.preview.row1Type',
      stageKey: 'landing.demo.stageInRoom',
      stageTone: 'navy',
      doctorViewKey: 'landing.demo.apt3Doc',
      receptionViewKey: 'landing.demo.apt3Rec',
      patientViewKey: 'landing.demo.apt3Pat',
    },
    {
      id: 'apt-4',
      ticketNumber: 13,
      timeDisplay: '16:30',
      patientNameKey: 'landing.preview.row3Name',
      visitTypeKey: 'landing.preview.row3Type',
      stageKey: 'landing.demo.stageCompleted',
      stageTone: 'success',
      doctorViewKey: 'landing.demo.apt4Doc',
      receptionViewKey: 'landing.demo.apt4Rec',
      patientViewKey: 'landing.demo.apt4Pat',
    },
  ];

  protected readonly selectedAppointment = computed(
    () =>
      this.appointments.find((apt) => apt.id === this.selectedAppointmentId()) ??
      this.appointments[0],
  );

  protected readonly currentServingTicket = computed(
    () => this.queueTickets().find((t) => t.state === 'serving') ?? null,
  );

  protected readonly hasWaitingTickets = computed(() =>
    this.queueTickets().some((t) => t.state === 'waiting'),
  );

  protected readonly financeSummary = computed<FinanceSummaryView>(() => {
    switch (this.financeBranch()) {
      case 'maadi':
        return {
          branchNameKey: 'landing.demo.finMaadi',
          visitsCount: 16,
          revenueAmount: '7,400',
          expenseAmount: '1,850',
        };
      case 'nasr':
        return {
          branchNameKey: 'landing.demo.finNasr',
          visitsCount: 11,
          revenueAmount: '5,200',
          expenseAmount: '1,300',
        };
      default:
        return {
          branchNameKey: 'landing.demo.finAllBranches',
          visitsCount: 27,
          revenueAmount: '12,600',
          expenseAmount: '3,150',
        };
    }
  });

  protected setMode(mode: DemoModeId): void {
    this.activeMode.set(mode);
    this.animateTargets('.demo-stage-surface', 10, 0.28);
  }

  protected selectAppointment(id: string): void {
    this.selectedAppointmentId.set(id);
    this.animateTargets('.apt-inspector-pane', 8, 0.24);
  }

  protected setClinicalTab(tab: ClinicalSubTabId): void {
    this.clinicalTab.set(tab);
  }

  protected setFinanceBranch(branch: FinanceBranchId): void {
    this.financeBranch.set(branch);
  }

  protected callNextTicket(): void {
    this.queueTickets.update((tickets) => {
      const firstWaitingIdx = tickets.findIndex((t) => t.state === 'waiting');
      if (firstWaitingIdx === -1) return tickets;
      return tickets.map((ticket, idx) => {
        if (ticket.state === 'serving') return { ...ticket, state: 'done' as const };
        if (idx === firstWaitingIdx) return { ...ticket, state: 'serving' as const };
        return ticket;
      });
    });
    this.animateTargets('.serving-banner, .queue-sim-row', 6, 0.24, 0.03);
  }

  protected resetQueue(): void {
    this.queueTickets.set(INITIAL_QUEUE);
    this.animateTargets('.serving-banner, .queue-sim-row', 6, 0.24, 0.03);
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    );
  }

  private animateTargets(
    selector: string,
    yOffset = 10,
    duration = 0.28,
    stagger = 0,
  ): void {
    if (this.prefersReducedMotion()) return;
    queueMicrotask(() => {
      const targets = this.elementRef.nativeElement.querySelectorAll(selector);
      if (!targets.length) return;
      gsap.fromTo(
        targets,
        { opacity: 0, y: yOffset },
        {
          opacity: 1,
          y: 0,
          duration,
          stagger,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        },
      );
    });
  }
}
