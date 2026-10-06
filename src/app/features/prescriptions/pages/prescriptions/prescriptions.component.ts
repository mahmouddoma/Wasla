import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../../shared/components/side-drawer/side-drawer';
import {
  PrescriptionsApi,
  PatientPrescription,
  PatientPrescriptionPage,
} from '../../../../domains/prescriptions';
import { PrescriptionWorkspaceComponent } from '../../components/prescription-workspace/prescription-workspace.component';
@Component({
  selector: 'app-prescriptions',
  imports: [
    LocalizedDatePipe,
    RouterLink,
    TranslatePipe,
    PageHeader,
    SideDrawer,
    PrescriptionWorkspaceComponent,
  ],
  templateUrl: './prescriptions.component.html',
  styleUrls: ['../../../../shared/styles/directory-workspace.css', './prescriptions.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrescriptionsComponent implements OnInit {
  private readonly api = inject(PrescriptionsApi);
  private readonly session = inject(AuthSession);
  private readonly route = inject(ActivatedRoute);
  readonly language = inject(LanguageService);
  readonly patient = this.route.snapshot.data['actor'] === 'Patient';
  readonly page = signal<PatientPrescriptionPage>({
    items: [],
    totalCount: 0,
    pageNumber: 1,
    pageSize: 20,
  });
  readonly detail = signal<PatientPrescription | null>(null);
  readonly doctorPrescriptionId = signal('');
  readonly opened = signal(false);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly failed = signal(false);
  readonly messages = signal<string[]>([]);
  readonly busy = signal(false);
  private listSequence = 0;
  private detailSequence = 0;
  ngOnInit() {
    if (this.patient) void this.load();
    else {
      const id = this.route.snapshot.queryParamMap.get('prescriptionId');
      if (
        id &&
        this.session.user()?.userType === 'Doctor' &&
        this.session.hasPermission('Prescriptions.ViewOwn')
      ) {
        this.doctorPrescriptionId.set(id);
        this.opened.set(true);
      }
    }
  }
  async load(pageNumber = 1) {
    if (
      !this.patient ||
      this.session.user()?.userType !== 'Patient' ||
      !this.session.hasPermission('Prescriptions.ViewOwnCompleted')
    )
      return;
    const sequence = ++this.listSequence;
    this.loading.set(true);
    this.failed.set(false);
    try {
      const page = await firstValueFrom(this.api.mine(pageNumber));
      if (sequence === this.listSequence) this.page.set(page);
    } catch (error) {
      if (sequence === this.listSequence) {
        this.failed.set(true);
        this.failure(error);
      }
    } finally {
      if (sequence === this.listSequence) this.loading.set(false);
    }
  }
  async inspect(prescriptionId: string) {
    if (
      !this.patient ||
      this.session.user()?.userType !== 'Patient' ||
      !this.session.hasPermission('Prescriptions.ViewOwnCompleted')
    )
      return;
    const sequence = ++this.detailSequence;
    this.opened.set(true);
    this.detail.set(null);
    this.detailLoading.set(true);
    this.messages.set([]);
    try {
      const detail = await firstValueFrom(this.api.myDetails(prescriptionId));
      if (sequence === this.detailSequence) this.detail.set(detail);
    } catch (error) {
      if (sequence === this.detailSequence) this.failure(error);
    } finally {
      if (sequence === this.detailSequence) this.detailLoading.set(false);
    }
  }
  close() {
    if (!this.busy()) {
      this.detailSequence++;
      this.opened.set(false);
      this.detail.set(null);
      this.doctorPrescriptionId.set('');
    }
  }
  label(item: { nameAr: string; nameEn: string | null }) {
    return this.language.currentLang() === 'ar' ? item.nameAr : item.nameEn || item.nameAr;
  }
  private failure(error: unknown) {
    const parsed = parseApiErrors(error);
    this.messages.set(
      parsed.status === 404
        ? ['medications.notFound']
        : [...parsed.messages, ...Object.values(parsed.fields).flat()],
    );
  }
}
