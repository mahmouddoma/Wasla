import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  inject,
  signal,
  OnChanges,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { createIdempotencyKey } from '../../../../core/http/create-idempotency-key';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import { DoctorPractice } from '../../../../domains/doctor-practices';
import {
  PracticeAllocationDetails,
  SubscriptionState,
  SubscriptionsApi,
} from '../../../../domains/subscriptions';
import { AllocationReceptionOption } from '../../../../domains/subscriptions/subscriptions-api';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
@Component({
  selector: 'app-practice-allocation',
  imports: [FormsModule, RouterLink, TranslatePipe, SideDrawer],
  templateUrl: './practice-allocation.component.html',
  styleUrl: './practice-allocation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeAllocationComponent implements OnChanges, OnDestroy {
  readonly practice = input.required<DoctorPractice>();
  readonly changed = output<void>();
  readonly session = inject(AuthSession);
  readonly state = inject(SubscriptionState);
  readonly language = inject(LanguageService);
  private readonly api = inject(SubscriptionsApi);
  private readonly toast = inject(ToastService);
  readonly value = signal<PracticeAllocationDetails | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly busy = signal(false);
  readonly action = signal<'move' | 'release' | null>(null);
  readonly step = signal<1 | 2>(1);
  readonly targetId = signal('');
  readonly selectedStaff = signal<string[]>([]);
  readonly staff = signal<AllocationReceptionOption[]>([]);
  reason = '';
  private generation = 0;
  private intent: { signature: string; key: string } | null = null;
  ngOnChanges(): void {
    void this.load();
  }
  ngOnDestroy(): void {
    this.generation++;
  }
  async load(force = false): Promise<void> {
    const seq = ++this.generation,
      id = this.practice().id;
    this.loading.set(true);
    this.error.set(false);
    this.value.set(null);
    if (!this.session.hasPermission('Subscriptions.ViewOwn')) {
      this.loading.set(false);
      return;
    }
    try {
      await this.state.refresh(force);
      const value = await this.state.refreshPractice(id);
      if (seq === this.generation) this.value.set(value);
    } catch {
      if (seq === this.generation) this.error.set(true);
    } finally {
      if (seq === this.generation) this.loading.set(false);
    }
  }
  getPlanTitle(planCode?: string | null): string {
    if (!planCode) return '';
    const translated = this.language.t('subscriptions.planName.' + planCode);
    if (!translated.startsWith('subscriptions.planName.')) return translated;
    return planCode;
  }
  availableTargetContracts() {
    const currentContractId = this.value()?.allocation?.subscriptionContractId;
    return this.state.availableContracts().filter(
      (c) => c.subscriptionContractId !== currentContractId,
    );
  }
  currentContract() {
    const currentContractId = this.value()?.allocation?.subscriptionContractId;
    if (!currentContractId) return null;
    return (
      this.state.contracts().find((c) => c.subscriptionContractId === currentContractId) ?? null
    );
  }
  target() {
    return this.state.contracts().find((c) => c.subscriptionContractId === this.targetId()) ?? null;
  }
  targetAllowsStaff(): boolean {
    return (
      this.target()?.periods.some(
        (p) =>
          this.state.effective(p.subscription) &&
          p.entitlements.some(
            (e) => e.featureCode === 'RECEPTION_MANAGEMENT' && e.accessLevel === 'Full',
          ),
      ) === true
    );
  }
  chooseTarget(event: Event): void {
    this.targetId.set((event.target as HTMLSelectElement).value);
    this.selectedStaff.set([]);
  }
  toggleStaff(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedStaff.update((ids) =>
      checked ? [...new Set([...ids, id])] : ids.filter((v) => v !== id),
    );
  }
  async open(action: 'move' | 'release'): Promise<void> {
    if (this.busy() || !this.session.hasPermission('Subscriptions.AllocationsManageOwn')) return;
    this.action.set(action);
    this.step.set(1);
    this.targetId.set('');
    this.selectedStaff.set([]);
    this.reason = '';
    this.intent = null;
    if (action === 'move' && this.session.hasPermission('ReceptionUsers.ViewOwn')) {
      const id = this.practice().id,
        seq = this.generation;
      try {
        const staff = await firstValueFrom(this.api.allocationReceptionOptions());
        if (id === this.practice().id && seq === this.generation)
          this.staff.set(
            staff.filter(
              (s) =>
                s.isActive && s.assignments.some((a) => a.isActive && a.doctorPracticeId === id),
            ),
          );
      } catch (error) {
        this.toast.error(
          this.language.t(parseApiErrors(error).messages[0] ?? 'common.requestFailed'),
        );
      }
    }
  }
  canMove(): boolean {
    return (
      !!this.target() &&
      this.target()!.availablePracticeSeats > 0 &&
      this.targetId() !== this.value()?.allocation?.subscriptionContractId &&
      (!this.selectedStaff().length || this.targetAllowsStaff())
    );
  }
  async confirm(): Promise<void> {
    const action = this.action(),
      id = this.practice().id,
      seq = this.generation;
    if (
      !action ||
      this.busy() ||
      !this.session.hasPermission('Subscriptions.AllocationsManageOwn') ||
      (action === 'move' && !this.canMove())
    )
      return;
    const rowVersion = this.value()?.allocation?.rowVersion ?? this.practice().rowVersion;
    if (!rowVersion || (action === 'release' && !this.value()?.allocation)) return;
    const body = {
      targetSubscriptionContractId: this.targetId(),
      continuedReceptionIds: this.targetAllowsStaff() ? this.selectedStaff() : [],
      rowVersion,
    };
    const signature = JSON.stringify({ id, action, body, reason: this.reason });
    if (this.intent?.signature !== signature)
      this.intent = { signature, key: createIdempotencyKey() };
    this.busy.set(true);
    try {
      await firstValueFrom(
        action === 'move'
          ? this.api.moveAllocation(id, body, this.intent.key)
          : this.api.releaseAllocation(
              id,
              { rowVersion, reason: this.reason.trim() || undefined },
              this.intent.key,
            ),
      );
      if (seq !== this.generation) return;
      this.toast.success('subscriptions.allocationSaved');
      this.action.set(null);
      this.intent = null;
      this.state.invalidate();
      await this.load();
      this.changed.emit();
    } catch (error) {
      if (seq !== this.generation) return;
      this.toast.error(
        this.language.t(parseApiErrors(error).messages[0] ?? 'common.requestFailed'),
      );
      if ([403, 404, 409].includes(parseApiErrors(error).status)) await this.load(true);
    } finally {
      this.busy.set(false);
    }
  }
}
