import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { componentsPart2 as components } from '../../../../domains/phase18';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';

export type ArchivedTicket = components['schemas']['ArchivedTicketItem'];

/** Renders archive facts only. The owning workspace supplies authorized detail requests. */
@Component({
  selector: 'app-archived-ticket-list',
  imports: [DatePipe, TranslatePipe],
  templateUrl: './archived-ticket-list.component.html',
  styleUrl: './archived-ticket-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivedTicketListComponent {
  readonly items = input<readonly ArchivedTicket[]>([]);
  readonly loading = input(false);
  readonly failed = input(false);
  readonly hasMore = input(false);
  readonly inspected = output<ArchivedTicket>();
  readonly more = output<void>();
  readonly retried = output<void>();
}
