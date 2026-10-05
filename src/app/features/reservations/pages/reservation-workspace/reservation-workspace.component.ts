import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import { LanguageService } from '../../../../core/i18n/language.service';
import { AuthSession } from '../../../../core/auth/auth-session';
import {
  ReservationActor,
  ReservationLabel,
  ReservationQuery,
} from '../../../../domains/reservations';
import { ReservationWorkspaceStore } from '../../state/reservation-workspace.store';
import { ReservationDetailsComponent } from '../../components/reservation-details/reservation-details.component';
import { ReservationEditorComponent } from '../../components/reservation-editor/reservation-editor.component';
import { ReservationCheckInComponent } from '../../components/reservation-check-in/reservation-check-in.component';
@Component({
  selector: 'app-reservation-workspace',
  imports: [
    TranslatePipe,
    RouterLink,
    PageHeader,
    SideDrawer,
    ReservationDetailsComponent,
    ReservationEditorComponent,
    ReservationCheckInComponent,
  ],
  providers: [ReservationWorkspaceStore],
  templateUrl: './reservation-workspace.component.html',
  styleUrl: './reservation-workspace.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationWorkspaceComponent implements OnInit {
  readonly store = inject(ReservationWorkspaceStore);
  readonly language = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSession, { optional: true });

  logout(): void {
    this.session?.clear?.();
    void this.router.navigate(['/login']);
  }

  statusClass(code: string): string {
    const lower = (code || '').toLowerCase();
    if (lower.includes('confirm') || lower.includes('active')) return 'status-confirmed';
    if (lower.includes('complete') || lower.includes('convert')) return 'status-completed';
    if (lower.includes('cancel') || lower.includes('noshow')) return 'status-cancelled';
    if (lower.includes('pend') || lower.includes('wait')) return 'status-pending';
    return 'status-neutral';
  }

  drawerTitle(): string {
    if (this.store.editor()) {
      const mode = this.store.editor();
      return mode === 'create'
        ? this.language.t('reservations.create')
        : mode === 'reschedule'
          ? this.language.t('reservations.reschedule')
          : this.language.t('reservations.cancel');
    }
    if (this.store.detail()) {
      return this.language.currentLang() === 'en' ? 'Reservation Details' : 'تفاصيل الحجز';
    }
    return this.language.t('reservations.loading');
  }

  drawerDescription(): string {
    if (this.store.detail()) {
      return this.store.detail()?.reference || '';
    }
    if (this.store.editor()) {
      return this.language.currentLang() === 'en'
        ? 'Manage appointment time and details'
        : 'إدارة بيانات وتوقيت الحجز';
    }
    return '';
  }
  async ngOnInit(): Promise<void> {
    const p = this.route.snapshot.queryParamMap;
    await this.store.initialize(
      this.route.snapshot.data['actor'] as ReservationActor,
      p.get('practiceId') || '',
    );
    if (p.get('eligibilityId') && p.get('patientId') && this.store.canCreate()) {
      await this.store.openEditor('create');
      await this.store.choosePatient(p.get('patientId')!);
      await this.store.chooseEligibility(p.get('eligibilityId')!);
    }
    else if (p.get('reservationId')) await this.store.inspect(p.get('reservationId')!);
    else if (p.get('date') && this.store.canCreate()) {
      await this.store.openEditor('create');
      await this.store.chooseDate(p.get('date')!);
      if (p.get('time')) await this.store.chooseTime(p.get('time')!);
    }
  }
  label(item?: { nameAr?: string; nameEn?: string | null } | null): string {
    if (!item) return '';
    return this.language.currentLang() === 'en'
      ? item.nameEn || item.nameAr || ''
      : item.nameAr || '';
  }
  viewPatients() {
    return [
      ...new Map(
        this.store
          .page()
          .items.filter((r) => r.patient?.id)
          .map((r) => [r.patient.id!, r.patient]),
      ).entries(),
    ];
  }
  status(code: string): string {
    const s = this.store.metadata()?.statuses.find((s) => s.code === code);
    const key = 'reservations.summary.' + code;
    return s ? this.label(s) : this.language.t(key) !== key ? this.language.t(key) : code;
  }
  setFilter(key: keyof ReservationQuery, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.store.query.update((q) => ({
      ...q,
      [key]: key === 'isLate' ? (value === '' ? undefined : value === 'true') : value || undefined,
      pageNumber: 1,
    }));
    void this.store.loadList();
  }
  practice(event: Event): void {
    void this.store.selectPractice((event.target as HTMLSelectElement).value);
  }
  page(delta: number): void {
    this.store.query.update((q) => ({ ...q, pageNumber: q.pageNumber + delta }));
    void this.store.loadList();
  }
  summary(): [string, number][] {
    return Object.entries(this.store.page().summary || {}).filter(
      ([key]) => key.toLowerCase() !== 'total',
    );
  }
  reasons(): ReservationLabel[] {
    return this.store.actor() === 'Patient'
      ? this.store.metadata()?.patientCancellationReasons || []
      : this.store.metadata()?.providerCancellationReasons || [];
  }
  back(): string {
    return this.store.actor() === 'Admin'
      ? '/admin'
      : '/workspace/' + this.store.actor().toLowerCase();
  }
}
