import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import {
  FollowUpEligibility,
  FollowUpPage,
  FollowUpQuery,
  FollowUpStatus,
  FollowUpsApi,
} from '../../../../domains/follow-ups';
import { BookablePatient, ReservationsApi } from '../../../../domains/reservations';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';

@Component({
  selector: 'app-follow-up-list',
  imports: [TranslatePipe, RouterLink, PageHeader, SideDrawer],
  templateUrl: './follow-up-list.component.html',
  styleUrl: './follow-up-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FollowUpListComponent implements OnInit {
  private readonly api = inject(FollowUpsApi);
  private readonly reservations = inject(ReservationsApi);
  private readonly toast = inject(ToastService);
  readonly language = inject(LanguageService);
  readonly patients = signal<readonly BookablePatient[]>([]);
  readonly query = signal<FollowUpQuery>({ pageNumber: 1, pageSize: 20 });
  readonly page = signal<FollowUpPage>({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
  readonly selected = signal<FollowUpEligibility | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly detailLoading = signal(false);
  readonly messages = signal<readonly string[]>([]);
  private sequence = 0;
  private detailSequence = 0;
  async ngOnInit() {
    // Follow-up viewing remains available when Create/bookable-patients is denied.
    try {
      this.patients.set(await firstValueFrom(this.reservations.bookablePatients()));
    } catch {
      this.patients.set([]);
    }
    await this.load();
  }
  async load() {
    const sequence = ++this.sequence;
    this.close();
    this.loading.set(true);
    this.failed.set(false);
    try {
      const page = await firstValueFrom(this.api.mine(this.query()));
      if (sequence === this.sequence) this.page.set(page);
    } catch (error) {
      if (sequence === this.sequence) {
        this.failed.set(true);
        this.failure(error);
      }
    } finally {
      if (sequence === this.sequence) this.loading.set(false);
    }
  }
  async inspect(id: string) {
    this.selected.set(null);
    const sequence = ++this.detailSequence;
    this.detailLoading.set(true);
    try {
      const selected = await firstValueFrom(this.api.details(id));
      if (sequence === this.detailSequence) this.selected.set(selected);
    } catch (error) {
      if (sequence === this.detailSequence) this.failure(error);
    } finally {
      if (sequence === this.detailSequence) this.detailLoading.set(false);
    }
  }
  filter(key: 'patientId' | 'status', event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.query.update((q) => ({
      ...q,
      ...(key === 'status'
        ? { status: (value as FollowUpStatus) || undefined }
        : { patientId: value || undefined }),
      pageNumber: 1,
    }));
    void this.load();
  }
  paginate(delta: number) {
    this.query.update((q) => ({ ...q, pageNumber: q.pageNumber + delta }));
    void this.load();
  }
  label(patient: BookablePatient) {
    return this.language.currentLang() === 'en' ? patient.nameEn || patient.nameAr : patient.nameAr;
  }
  patientName(id: string) {
    const patient = this.patients().find((p) => p.patientId === id);
    return patient ? this.label(patient) : this.language.t('reservations.patient');
  }
  close() {
    this.detailSequence++;
    this.selected.set(null);
    this.detailLoading.set(false);
  }
  private failure(error: unknown) {
    const parsed = parseApiErrors(error);
    const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
    this.messages.set(messages.length ? messages : ['encounters.failed']);
    this.toast.error(messages[0] || 'encounters.failed');
    if (error instanceof HttpErrorResponse && (error.status === 403 || error.status === 404))
      this.selected.set(null);
  }
}
