import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import { LanguageService } from '../../../../core/i18n/language.service';
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
    NgTemplateOutlet,
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
  readonly receptionViews = ['Today', 'Upcoming', 'All'] as const;
  readonly store = inject(ReservationWorkspaceStore);
  readonly language = inject(LanguageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly emptyTitleKey = computed(() => {
    if (this.store.actor() !== 'Reception') return 'reservations.empty';
    if (!this.store.practiceId()) return 'reception.appointments.chooseClinic';
    if (!this.store.canView()) return 'reception.appointments.viewUnavailable';
    if (this.store.isReceptionTodayEmpty()) return 'reception.appointments.emptyToday';
    return 'reception.appointments.empty';
  });

  readonly emptySubtitleKey = computed(() => {
    if (this.store.actor() !== 'Reception') return 'reservations.subtitle';
    if (!this.store.practiceId()) return 'reception.appointments.chooseClinicHelp';
    if (!this.store.canView()) return 'reception.appointments.viewUnavailableHelp';
    if (this.store.isReceptionTodayEmpty()) return 'reception.appointments.emptyTodayHelp';
    return 'reception.appointments.emptyHelp';
  });

  statusClass(code: string): string {
    const lower = (code || '').toLowerCase();
    if (lower.includes('confirm') || lower.includes('active')) return 'status-confirmed';
    if (lower.includes('complete') || lower.includes('convert')) return 'status-completed';
    if (lower.includes('cancel') || lower.includes('noshow')) return 'status-cancelled';
    if (lower.includes('pend') || lower.includes('wait')) return 'status-pending';
    return 'status-neutral';
  }

  drawerTitle(): string {
    if (this.store.checkedInTicket()) return this.language.t('reception.arrival.done');
    if (this.store.arrival()) return this.language.t('reception.arrival.title');
    if (this.store.editor()) {
      const mode = this.store.editor();
      return mode === 'create'
        ? this.language.t(
            this.store.actor() === 'Reception'
              ? 'reception.appointments.book'
              : 'reservations.create',
          )
        : mode === 'reschedule'
          ? this.language.t('reservations.reschedule')
          : this.language.t(mode === 'restore' ? 'reservations.restore' : 'reservations.cancel');
    }
    if (this.store.detail()) {
      return this.language.t(
        this.store.actor() === 'Reception'
          ? 'reception.appointments.details'
          : 'reservations.detailsTitle',
      );
    }
    return this.language.t('reservations.loading');
  }

  drawerDescription(): string {
    if (this.store.detail()) {
      return this.store.actor() === 'Reception'
        ? this.label(this.store.detail()?.patient)
        : this.store.detail()?.reference || '';
    }
    if (this.store.editor()) {
      return this.language.t(
        this.store.actor() === 'Reception'
          ? 'reception.appointments.editorHelp'
          : 'reservations.editorHelp',
      );
    }
    return '';
  }
  async ngOnInit(): Promise<void> {
    const p = this.route.snapshot.queryParamMap;
    await this.store.initialize(
      this.route.snapshot.data['actor'] as ReservationActor,
      p.get('practiceId') || '',
    );
    const initialPractice = this.store.practiceId();
    const validReceptionScope =
      this.store.actor() !== 'Reception' ||
      !p.get('practiceId') ||
      p.get('practiceId') === initialPractice;
    if (!validReceptionScope) {
      this.store.messages.set(['reception.appointments.linkClinicUnavailable']);
      return;
    }
    const linkedEligibility =
      !!p.get('eligibilityId') && !!p.get('patientId') && this.store.canCreate();
    if (p.get('reservationId') && !linkedEligibility)
      await this.store.inspect(p.get('reservationId')!);
    else if (
      (linkedEligibility ||
        p.get('date') ||
        (this.store.actor() === 'Reception' && p.get('patientId'))) &&
      this.store.canCreate()
    ) {
      await this.store.openEditor('create');
      if (this.store.practiceId() !== initialPractice || !this.store.editor()) return;
      if (p.get('patientId')) {
        await this.store.choosePatient(p.get('patientId')!);
        if (this.store.practiceId() !== initialPractice || !this.store.editor()) return;
        // Names are display hints from an existing search/create result. API validation owns identity.
        const state: unknown =
          this.router.lastSuccessfulNavigation()?.extras.state?.['receptionPatient'] ||
          history.state?.receptionPatient;
        if (
          state &&
          typeof state === 'object' &&
          'patientId' in state &&
          'practiceId' in state &&
          'nameAr' in state &&
          state.patientId === p.get('patientId') &&
          state.practiceId === initialPractice &&
          typeof state.nameAr === 'string'
        ) {
          this.store.bookingPatient.set({
            patientId: p.get('patientId')!,
            nameAr: state.nameAr,
            nameEn: 'nameEn' in state && typeof state.nameEn === 'string' ? state.nameEn : null,
          });
        }
      }
      if (p.get('eligibilityId') && p.get('patientId'))
        await this.store.chooseEligibility(p.get('eligibilityId')!);
      if (this.store.practiceId() !== initialPractice || !this.store.editor()) return;
      if (p.get('date')) await this.store.chooseDate(p.get('date')!);
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
    if (this.store.actor() === 'Reception' && (key === 'fromDate' || key === 'toDate'))
      this.store.receptionView.set('Custom');
    this.store.query.update((q) => ({
      ...q,
      [key]: key === 'isLate' ? (value === '' ? undefined : value === 'true') : value || undefined,
      pageNumber: 1,
    }));
    void this.store.loadList();
  }
  async choosePatient(patientId: string): Promise<void> {
    const practiceId = this.store.practiceId(),
      date = this.store.date();
    await this.store.choosePatient(patientId);
    if (
      this.store.actor() === 'Reception' &&
      date &&
      this.store.practiceId() === practiceId &&
      this.store.bookingPatientId() === patientId &&
      this.store.editor() === 'create'
    )
      await this.store.chooseDate(date);
  }
  resetFilters(): void {
    this.store.query.set({ pageNumber: 1, pageSize: 20 });
    this.store.setReceptionView('Today');
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
}
