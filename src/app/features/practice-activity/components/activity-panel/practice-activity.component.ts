import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { Phase18Part2Api } from '../../../../domains/phase18';
import type { componentsPart2 as components } from '../../../../domains/phase18';

type AuditEvent = components['schemas']['SafeAuditEvent'];
type AuditOption = components['schemas']['ArchiveOption'];

/** Actor-scoped, operational metadata only; the server authorizes each read. */
@Component({
  selector: 'app-practice-activity',
  imports: [DatePipe, TranslatePipe],
  templateUrl: './practice-activity.component.html',
  styleUrl: './practice-activity.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeActivityComponent {
  readonly practiceId = input.required<string>();
  readonly actor = input.required<'Doctor' | 'Reception'>();
  private readonly api = inject(Phase18Part2Api);
  protected readonly language = inject(LanguageService);
  protected readonly items = signal<readonly AuditEvent[]>([]);
  protected readonly options = signal<components['schemas']['AuditOptions'] | null>(null);
  protected readonly selected = signal<AuditEvent | null>(null);
  protected readonly loading = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly failed = signal(false);
  protected readonly detailFailed = signal(false);
  protected readonly hasMore = signal(false);
  protected readonly action = signal('');
  protected readonly outcome = signal('');
  private cursor: string | null = null;
  private sequence = 0;
  private detailSequence = 0;
  private contextSequence = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.contextSequence++;
      this.sequence++;
      this.detailSequence++;
    });
    effect(() => {
      const id = this.practiceId(),
        actor = this.actor();
      untracked(() => {
        this.contextSequence++;
        this.sequence++;
        this.closeDetails();
        this.items.set([]);
        this.options.set(null);
        this.action.set('');
        this.outcome.set('');
        this.cursor = null;
        this.hasMore.set(false);
        if (id && (actor === 'Doctor' || actor === 'Reception')) void this.initialize();
      });
    });
  }

  private async initialize(): Promise<void> {
    const context = this.contextSequence;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const options = await firstValueFrom(
        this.api.call(this.actor() === 'Doctor' ? 'P18.2-36' : 'P18.2-37', {
          pathParams: { practiceId: this.practiceId() },
        }),
      );
      if (context !== this.contextSequence) return;
      this.options.set(options);
      await this.load();
    } catch (error) {
      if (context === this.contextSequence) this.fail(error);
    } finally {
      if (context === this.contextSequence) this.loading.set(false);
    }
  }

  protected async retry(): Promise<void> {
    if (this.options()) await this.load(this.hasMore());
    else await this.initialize();
  }

  protected async load(append = false): Promise<void> {
    if (!this.practiceId() || (append && (!this.cursor || this.loading()))) return;
    const sequence = ++this.sequence;
    this.loading.set(true);
    this.failed.set(false);
    this.closeDetails();
    if (!append) {
      this.cursor = null;
      this.items.set([]);
      this.hasMore.set(false);
    }
    try {
      const page = await firstValueFrom(
        this.api.call(this.actor() === 'Doctor' ? 'P18.2-23' : 'P18.2-26', {
          pathParams: { practiceId: this.practiceId() },
          query: {
            PageSize: 20,
            Cursor: this.cursor,
            Action: this.action() || undefined,
            Outcome: this.outcome() || undefined,
          },
        }),
      );
      if (sequence !== this.sequence) return;
      const items = new Map(this.items().map((item) => [item.eventKey, item]));
      for (const item of page.items ?? []) items.set(item.eventKey, item);
      this.items.set([...items.values()]);
      this.cursor = page.nextCursor ?? null;
      this.hasMore.set(page.hasMore && !!this.cursor);
    } catch (error) {
      if (sequence === this.sequence) this.fail(error);
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }

  protected async inspect(item: AuditEvent): Promise<void> {
    if (!item.eventKey || !this.items().some((row) => row.eventKey === item.eventKey)) return;
    const sequence = ++this.detailSequence;
    this.selected.set(null);
    this.detailLoading.set(true);
    this.detailFailed.set(false);
    try {
      const detail = await firstValueFrom(
        this.api.call(this.actor() === 'Doctor' ? 'P18.2-24' : 'P18.2-27', {
          pathParams: { practiceId: this.practiceId(), eventKey: item.eventKey },
        }),
      );
      if (sequence === this.detailSequence) this.selected.set(detail);
    } catch (error) {
      if (sequence === this.detailSequence) {
        this.detailFailed.set(true);
        if (error instanceof HttpErrorResponse && [401, 403, 404].includes(error.status))
          this.fail(error);
      }
    } finally {
      if (sequence === this.detailSequence) this.detailLoading.set(false);
    }
  }

  protected closeDetails(): void {
    this.detailSequence++;
    this.selected.set(null);
    this.detailLoading.set(false);
    this.detailFailed.set(false);
  }
  protected async filter(kind: 'action' | 'outcome', event: Event): Promise<void> {
    const value = (event.target as HTMLSelectElement).value;
    const allowed = kind === 'action' ? this.options()?.actions : this.options()?.outcomes;
    if (value && !allowed?.some((option) => option.code === value)) return;
    (kind === 'action' ? this.action : this.outcome).set(value);
    await this.load();
  }
  protected label(
    value: string | null | undefined,
    options: readonly AuditOption[] | null | undefined,
  ): string {
    const option = options?.find((item) => item.code === value);
    return (
      (this.language.isRtl()
        ? option?.nameAr || option?.nameEn
        : option?.nameEn || option?.nameAr) || this.language.t('activity.recorded')
    );
  }
  protected actorLabel(item: AuditEvent): string {
    const actor = this.options()?.actors.items?.find((actor) => actor.actorId === item.actorId);
    const name = this.language.isRtl()
      ? actor?.nameAr || actor?.nameEn
      : actor?.nameEn || actor?.nameAr;
    if (name) return name;
    const key = `recordAccess.actor.${item.actorType}`;
    const label = this.language.t(key);
    return label === key ? this.language.t('recordAccess.actor.other') : label;
  }

  private fail(error: unknown): void {
    this.failed.set(true);
    if (error instanceof HttpErrorResponse && [401, 403, 404].includes(error.status)) {
      this.items.set([]);
      this.options.set(null);
      this.cursor = null;
      this.hasMore.set(false);
      this.closeDetails();
    }
  }
}
