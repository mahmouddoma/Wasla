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
import { PracticeTicket, TicketsApi } from '../../../../domains/tickets';
import { LanguageSwitcher } from '../../../../shared/components/language-switcher/language-switcher';
import { PlatformFooter } from '../../../../shared/components/platform-footer/platform-footer';

@Component({
  selector: 'app-patient-tickets',
  imports: [RouterLink, TranslatePipe, LanguageSwitcher, PlatformFooter],
  templateUrl: './patient-tickets.html',
  styleUrl: './patient-tickets.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientTickets implements OnInit {
  private readonly api = inject(TicketsApi);
  protected readonly language = inject(LanguageService);
  private readonly drawer = viewChild<ElementRef<HTMLDialogElement>>('drawer');
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

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.messages.set([]);
    try {
      this.tickets.set(await firstValueFrom(this.api.myActive()));
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

  private failure(error: unknown): void {
    const parsed = parseApiErrors(error);
    const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages.length ? messages : ['tickets.loadFailed']);
  }
}
