import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  afterRenderEffect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { PracticeTicket, TicketsApi } from '../../../../domains/tickets';
import { Phase18Part2Api } from '../../../../domains/phase18';

@Component({
  selector: 'app-patient-tickets',
  imports: [TranslatePipe, PageHeader, RouterLink],
  templateUrl: './patient-tickets.html',
  styleUrl: './patient-tickets.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientTickets implements OnInit {
  private readonly api = inject(TicketsApi);
  private readonly phase18Api = inject(Phase18Part2Api);
  protected readonly language = inject(LanguageService);
  private readonly drawer = viewChild<ElementRef<HTMLDialogElement>>('drawer');
  protected readonly viewMode = signal<'active' | 'archived'>('active');
  protected readonly tickets = signal<readonly PracticeTicket[]>([]);
  protected readonly selected = signal<PracticeTicket | null>(null);
  protected readonly loading = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly messages = signal<readonly string[]>([]);

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.drawer()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async setViewMode(mode: 'active' | 'archived'): Promise<void> {
    this.viewMode.set(mode);
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.messages.set([]);
    try {
      if (this.viewMode() === 'archived') {
        const page = await firstValueFrom(this.phase18Api.call('P18.2-11', { query: { pageSize: 50 } }));
        const mapped: PracticeTicket[] = (page.items ?? []).map((item) => ({
          ticketId: item.ticketId,
          ticketNumber: String(item.ticketNumber),
          businessDate: item.businessDate,
          status: (item.status as any) || 'Completed',
          source: 'WalkIn',
          isArchived: true,
          archivedAtUtc: item.archivedAtUtc,
          lastUpdatedOnUtc: item.archivedAtUtc,
          patientsAheadNow: 0,
          fastTrack: false,
          callAttempts: [],
          practice: {
            id: item.doctorPracticeId,
            nameAr: 'العيادة',
            nameEn: 'Practice',
          },
          doctor: {
            id: '',
            nameAr: '',
            nameEn: null,
          },
          patient: {
            id: '',
            nameAr: '',
            nameEn: null,
          },
          rowVersion: '',
          timeline: [],
          actions: {
            canCallNext: false,
            canManualCall: false,
            canRecall: false,
            canConfirmNoResponse: false,
            canRestoreNoShow: false,
            canStart: false,
            canComplete: false,
            canCancel: false,
            canCheckIn: false,
            canRefund: false,
          },
        }));
        this.tickets.set(mapped);
      } else {
        this.tickets.set(await firstValueFrom(this.api.myActive()));
      }
    } catch (error) {
      this.failure(error);
    } finally {
      this.loading.set(false);
    }
  }

  protected async inspect(ticketId: string): Promise<void> {
    this.detailLoading.set(true);
    this.selected.set(null);
    try {
      this.selected.set(await firstValueFrom(this.api.myDetails(ticketId)));
    } catch (error) {
      this.failure(error);
    } finally {
      this.detailLoading.set(false);
    }
  }

  protected close(): void {
    this.selected.set(null);
    this.detailLoading.set(false);
  }

  protected cancelDialog(event: Event): void {
    event.preventDefault();
    this.close();
  }

  protected label(item: { nameAr: string; nameEn?: string | null }): string {
    return this.language.currentLang() === 'en' ? item.nameEn || item.nameAr : item.nameAr;
  }

  protected statusKey(status: string): string {
    return `tickets.status.${status}`;
  }

  protected statusClass(status: string): string {
    const lower = (status || '').toLowerCase();
    if (lower.includes('progress') || lower.includes('called') || lower.includes('active')) {
      return 'status-active';
    }
    if (lower.includes('complete') || lower.includes('done')) {
      return 'status-completed';
    }
    if (lower.includes('cancel') || lower.includes('noshow')) {
      return 'status-cancelled';
    }
    return 'status-waiting';
  }

  private failure(error: unknown): void {
    const parsed = parseApiErrors(error);
    const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages.length ? messages : ['tickets.loadFailed']);
  }
}
