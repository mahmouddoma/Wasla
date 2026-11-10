import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  DestroyRef,
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
import {
  ArchivedTicket,
  ArchivedTicketListComponent,
} from '../../components/archived-ticket-list/archived-ticket-list.component';

@Component({
  selector: 'app-patient-tickets',
  imports: [TranslatePipe, PageHeader, RouterLink, ArchivedTicketListComponent],
  templateUrl: './patient-tickets.html',
  styleUrl: './patient-tickets.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientTickets implements OnInit {
  private readonly api = inject(TicketsApi);
  private readonly phase18Api = inject(Phase18Part2Api);
  protected readonly language = inject(LanguageService);
  private readonly drawer = viewChild<ElementRef<HTMLDialogElement>>('drawer');
  private listSequence = 0;
  private detailSequence = 0;
  private archiveCursor: string | null = null;
  protected readonly archivedTickets = signal<readonly ArchivedTicket[]>([]);
  protected readonly archiveHasMore = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly selectedArchived = signal(false);
  protected readonly viewMode = signal<'active' | 'archived'>('active');
  protected readonly tickets = signal<readonly PracticeTicket[]>([]);
  protected readonly selected = signal<PracticeTicket | null>(null);
  protected readonly loading = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly messages = signal<readonly string[]>([]);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.listSequence++;
      this.detailSequence++;
    });
    afterRenderEffect(() => {
      const dialog = this.drawer()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async setViewMode(mode: 'active' | 'archived'): Promise<void> {
    this.close();
    this.viewMode.set(mode);
    await this.load();
  }

  protected async load(): Promise<void> {
    this.archiveCursor = null;
    this.archiveHasMore.set(false);
    this.archivedTickets.set([]);
    this.tickets.set([]);
    await this.loadPage();
  }

  protected async loadMore(): Promise<void> {
    if (!this.loading() && this.archiveHasMore()) await this.loadPage();
  }

  protected async retry(): Promise<void> {
    if (!this.loading()) await this.loadPage();
  }

  private async loadPage(): Promise<void> {
    const sequence = ++this.listSequence;
    this.loading.set(true);
    this.loadFailed.set(false);
    this.messages.set([]);
    try {
      if (this.viewMode() === 'archived') {
        const page = await firstValueFrom(
          this.phase18Api.call('P18.2-11', {
            query: { pageSize: 50, cursor: this.archiveCursor },
          }),
        );
        if (sequence !== this.listSequence) return;
        const items = new Map(this.archivedTickets().map((item) => [item.ticketId, item]));
        for (const item of page.items ?? []) items.set(item.ticketId, item);
        this.archivedTickets.set([...items.values()]);
        this.archiveCursor = page.nextCursor ?? null;
        this.archiveHasMore.set(page.hasMore && !!page.nextCursor);
      } else {
        const tickets = await firstValueFrom(this.api.myActive());
        if (sequence === this.listSequence) this.tickets.set(tickets);
      }
    } catch (error) {
      if (sequence !== this.listSequence) return;
      this.loadFailed.set(true);
      this.failure(error);
    } finally {
      if (sequence === this.listSequence) this.loading.set(false);
    }
  }

  protected async inspect(ticketId: string): Promise<void> {
    const sequence = ++this.detailSequence;
    this.selectedArchived.set(this.viewMode() === 'archived');
    this.detailLoading.set(true);
    this.selected.set(null);
    try {
      const ticket = await firstValueFrom(this.api.myDetails(ticketId));
      if (sequence === this.detailSequence) this.selected.set(ticket);
    } catch (error) {
      if (sequence === this.detailSequence) this.failure(error);
    } finally {
      if (sequence === this.detailSequence) this.detailLoading.set(false);
    }
  }

  protected close(): void {
    this.detailSequence++;
    this.selectedArchived.set(false);
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
