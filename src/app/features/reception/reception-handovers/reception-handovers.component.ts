import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { Phase18Api, components } from '../../../domains/phase18';
import { ReceptionPracticeContext } from '../../../domains/reception-practices';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';

type Handover = components['schemas']['HandoverResponse'];
type HandoverOperation = 'P18-099' | 'P18-101';

@Component({
  selector: 'app-reception-handovers',
  imports: [DatePipe, FormsModule, TranslatePipe, PageHeader, SideDrawer],
  templateUrl: './reception-handovers.component.html',
  styleUrl: './reception-handovers.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceptionHandoversComponent {
  private readonly api = inject(Phase18Api);
  private readonly context = inject(ReceptionPracticeContext);
  readonly language = inject(LanguageService);
  private readonly toast = inject(ToastService);
  readonly practiceId = this.context.currentPracticeId;
  readonly canView = computed(() => this.context.allows('Handovers.ViewAssigned'));
  readonly canCreate = computed(
    () => this.canView() && this.context.allows('Handovers.CreateAssigned'),
  );
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly handovers = signal<Handover[]>([]);
  readonly selectedHandover = signal<Handover | null>(null);
  readonly drawerMode = signal<'view' | 'create' | null>(null);
  readonly submitting = signal(false);
  readonly pageNumber = signal(1);
  readonly totalCount = signal(0);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / 50)));
  newSummary = '';
  private sequence = 0;
  // Retain a key after failure so a retry cannot duplicate an already processed creation.
  private createAttempt: { practiceId: string; summary: string; key: string } | null = null;
  private actionAttempt: { signature: string; key: string } | null = null;

  constructor() {
    void this.context.ensureLoaded();
    effect(() => {
      this.practiceId();
      this.drawerMode.set(null);
      this.selectedHandover.set(null);
      void this.loadHandovers();
    });
  }

  async loadHandovers(page = 1): Promise<void> {
    const practiceId = this.practiceId();
    const sequence = ++this.sequence;
    this.error.set(false);
    this.handovers.set([]);
    this.totalCount.set(0);
    this.pageNumber.set(page);
    this.loading.set(!!practiceId && this.canView());
    if (!practiceId || !this.canView()) return;
    try {
      const response = await firstValueFrom(
        this.api.call('P18-096', {
          path: { practiceId },
          query: { pageNumber: page, pageSize: 50 },
        }),
      );
      if (sequence !== this.sequence || practiceId !== this.practiceId()) return;
      this.handovers.set(response.items ?? []);
      this.totalCount.set(response.totalCount ?? response.items?.length ?? 0);
    } catch {
      if (sequence === this.sequence) this.error.set(true);
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }

  openCreateDrawer(): void {
    if (!this.practiceId() || !this.canCreate() || this.submitting()) return;
    this.newSummary = '';
    this.drawerMode.set('create');
  }

  openViewDrawer(handover: Handover): void {
    if (!this.canView() || this.submitting()) return;
    this.selectedHandover.set(handover);
    this.drawerMode.set('view');
  }

  closeDrawer(): void {
    if (this.submitting()) return;
    this.drawerMode.set(null);
    this.selectedHandover.set(null);
  }

  canAct(handover: Handover, action: 'Acknowledge' | 'Close'): boolean {
    return (
      this.canView() &&
      this.context.allows(
        action === 'Acknowledge' ? 'Handovers.AcknowledgeAssigned' : 'Handovers.CloseAssigned',
      ) &&
      !!handover.id &&
      !!handover.rowVersion &&
      handover.status !== 'Closed' &&
      (action !== 'Acknowledge' || handover.status === 'Open') &&
      !!handover.availableActions?.some(
        (item) => item.allowed && item.code?.toLowerCase() === action.toLowerCase(),
      )
    );
  }

  statusLabel(handover: Handover): string {
    return this.language.t(
      handover.status === 'Acknowledged'
        ? 'handovers.acknowledgedShift'
        : handover.status === 'Closed'
          ? 'handovers.closedShift'
          : 'handovers.openShift',
    );
  }

  async submitNewHandover(): Promise<void> {
    const practiceId = this.practiceId();
    const summary = this.newSummary.trim();
    if (!practiceId || !this.canCreate() || !summary || this.submitting()) return;
    if (this.createAttempt?.practiceId !== practiceId || this.createAttempt.summary !== summary) {
      this.createAttempt = { practiceId, summary, key: crypto.randomUUID() };
    }
    this.submitting.set(true);
    try {
      await firstValueFrom(
        this.api.call('P18-097', {
          path: { practiceId },
          body: { summary },
          idempotencyKey: this.createAttempt.key,
        }),
      );
      this.createAttempt = null;
      this.toast.success(this.language.t('handovers.success'));
      if (practiceId === this.practiceId()) {
        this.drawerMode.set(null);
        this.selectedHandover.set(null);
        await this.loadHandovers();
      }
    } catch {
      this.toast.error(this.language.t('reception.audit.saveFailed'));
    } finally {
      this.submitting.set(false);
    }
  }

  acknowledgeHandover(handover: Handover): Promise<void> {
    return this.performAction(handover, 'P18-099', 'Acknowledge');
  }

  closeHandover(handover: Handover): Promise<void> {
    return this.performAction(handover, 'P18-101', 'Close');
  }

  private async performAction(
    handover: Handover,
    operation: HandoverOperation,
    action: 'Acknowledge' | 'Close',
  ): Promise<void> {
    const practiceId = this.practiceId();
    if (!practiceId || !handover.id || this.submitting() || !this.canAct(handover, action)) return;
    const signature = [practiceId, handover.id, operation, handover.rowVersion].join(':');
    if (this.actionAttempt?.signature !== signature)
      this.actionAttempt = { signature, key: crypto.randomUUID() };
    this.submitting.set(true);
    try {
      const result = await firstValueFrom(
        this.api.call(operation, {
          path: { practiceId, handoverId: handover.id },
          body: {
            rowVersion: handover.rowVersion,
            ...(action === 'Close' ? { outcome: 'Completed' } : {}),
          },
          idempotencyKey: this.actionAttempt.key,
        }),
      );
      this.actionAttempt = null;
      this.toast.success(this.language.t('handovers.success'));
      if (practiceId === this.practiceId()) {
        this.selectedHandover.set(result);
        await this.loadHandovers(this.pageNumber());
      }
    } catch {
      this.toast.error(this.language.t('reception.audit.saveFailed'));
    } finally {
      this.submitting.set(false);
    }
  }
}
