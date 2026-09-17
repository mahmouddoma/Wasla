import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  afterRenderEffect,
  viewChild,
  ElementRef,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../../core/i18n/language.service';
import {
  ReservationActor,
  ReservationLabel,
  ReservationQuery,
} from '../../../../domains/reservations';
import { ReservationWorkspaceStore } from '../../state/reservation-workspace.store';
import { ReservationDetailsComponent } from '../../components/reservation-details/reservation-details.component';
import { ReservationEditorComponent } from '../../components/reservation-editor/reservation-editor.component';
import { PlatformFooter } from '../../../../shared/components/platform-footer/platform-footer';
@Component({
  selector: 'app-reservation-workspace',
  imports: [
    TranslatePipe,
    RouterLink,
    ReservationDetailsComponent,
    ReservationEditorComponent,
    PlatformFooter,
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
  private readonly drawer = viewChild<ElementRef<HTMLDialogElement>>('drawer');
  constructor() {
    afterRenderEffect(() => {
      const dialog = this.drawer()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    });
  }
  cancelDialog(event: Event): void {
    event.preventDefault();
    this.store.close();
  }
  async ngOnInit(): Promise<void> {
    const p = this.route.snapshot.queryParamMap;
    await this.store.initialize(
      this.route.snapshot.data['actor'] as ReservationActor,
      p.get('practiceId') || '',
    );
    if (p.get('reservationId')) await this.store.inspect(p.get('reservationId')!);
    else if (p.get('date') && this.store.canCreate()) {
      await this.store.openEditor('create');
      await this.store.chooseDate(p.get('date')!);
      if (p.get('time')) await this.store.chooseTime(p.get('time')!);
    }
  }
  label(item: { nameAr: string; nameEn?: string | null }): string {
    return this.language.currentLang() === 'en' ? item.nameEn || item.nameAr : item.nameAr;
  }
  viewPatients() {
    return [
      ...new Map(
        this.store
          .page()
          .items.filter((r) => r.patient.id)
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
    return Object.entries(this.store.page().summary || {});
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
