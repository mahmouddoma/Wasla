import { ClinicalFilterQuery } from '../../../../domains/doctor-patients';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../../core/i18n/language.service';
import { DiagnosticsApi, DiagnosticQuery } from '../../../../domains/diagnostics';
import { DiagnosticKind } from '../../../../domains/medical-catalog';
import type {
  DiagnosticRequestSummary,
  DiagnosticResultResponse,
  DiagnosticSubmissionSummary,
} from '../../../../domains/diagnostics';
import { LocalizedDatePipe } from '../../../../shared/pipes/localized-date.pipe';
type SubTab = 'requests' | 'results' | 'submissions';
@Component({
  selector: 'app-patient-diagnostics-tab',
  imports: [TranslatePipe, LocalizedDatePipe],
  templateUrl: './patient-diagnostics-tab.component.html',
  styleUrl: './patient-diagnostics-tab.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientDiagnosticsTabComponent implements OnInit, OnChanges, OnDestroy {
  private readonly api = inject(DiagnosticsApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  readonly language = inject(LanguageService);
  readonly filters = input<Partial<ClinicalFilterQuery>>({});
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters'] && !changes['filters'].firstChange) void this.loadData();
  }
  readonly patientId = input.required<string>();
  readonly isHistoricalOnly = input(false);
  readonly currentKind = signal<DiagnosticKind>('lab');
  readonly currentTab = signal<SubTab>('requests');
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly requests = signal<readonly DiagnosticRequestSummary[]>([]);
  readonly results = signal<readonly DiagnosticResultResponse[]>([]);
  readonly submissions = signal<readonly DiagnosticSubmissionSummary[]>([]);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly rows = computed(() =>
    this.currentTab() === 'requests'
      ? this.requests().map((r) => ({ id: r.requestId, date: r.requestedAtUtc, status: r.status }))
      : this.currentTab() === 'results'
        ? this.results().map((r) => ({
            id: r.resultId,
            date: r.current?.reviewedAtUtc ?? null,
            status: r.current?.status ?? 'NoCurrentResult',
          }))
        : this.submissions().map((r) => ({
            id: r.submissionId,
            date: r.submittedAtUtc,
            status: r.status,
          })),
  );
  private sequence = 0;
  ngOnInit(): void {
    const initial = (['lab', 'radiology'] as const).flatMap((kind) =>
      (['requests', 'results', 'submissions'] as const)
        .filter((tab) => this.allowed(kind, tab))
        .map((tab) => ({ kind, tab })),
    )[0];
    if (initial) {
      this.currentKind.set(initial.kind);
      this.currentTab.set(initial.tab);
      void this.loadData();
    }
  }
  ngOnDestroy(): void {
    this.sequence++;
    this.requests.set([]);
    this.results.set([]);
    this.submissions.set([]);
  }
  allowed(kind: DiagnosticKind, tab: SubTab): boolean {
    return this.session.hasPermission(
      (kind === 'lab' ? 'Lab' : 'Radiology') +
        (tab === 'requests' ? 'Requests' : tab === 'results' ? 'Results' : 'ResultSubmissions') +
        '.ViewOwn',
    );
  }
  setKind(kind: DiagnosticKind): void {
    const tab = (['requests', 'results', 'submissions'] as const).find((t) =>
      this.allowed(kind, t),
    );
    if (!tab) return;
    this.currentKind.set(kind);
    this.currentTab.set(tab);
    void this.loadData();
  }
  setTab(tab: SubTab): void {
    if (!this.allowed(this.currentKind(), tab)) return;
    this.currentTab.set(tab);
    void this.loadData();
  }
  async loadData(page = 1): Promise<void> {
    const seq = ++this.sequence,
      kind = this.currentKind(),
      tab = this.currentTab();
    this.requests.set([]);
    this.results.set([]);
    this.submissions.set([]);
    this.page.set(page);
    if (!this.allowed(kind, tab)) return;
    this.loading.set(true);
    this.error.set(false);
    const query: DiagnosticQuery = {
      PatientId: this.patientId(),
      PageNumber: page,
      PageSize: 20,
      ...(this.filters().practiceId ? { PracticeId: this.filters().practiceId } : {}),
      ...(this.filters().fromDate ? { FromDate: this.filters().fromDate } : {}),
      ...(this.filters().toDate ? { ToDate: this.filters().toDate } : {}),
    };
    try {
      if (tab === 'requests') {
        const result = await firstValueFrom(this.api.requests(kind, 'Doctor', query));
        if (seq === this.sequence) {
          this.requests.set(result.items || []);
          this.total.set(result.totalCount);
        }
      } else if (tab === 'results') {
        const result = await firstValueFrom(this.api.results(kind, 'Doctor', query));
        if (seq === this.sequence) {
          this.results.set(result.items || []);
          this.total.set(result.totalCount);
        }
      } else {
        const result = await firstValueFrom(this.api.inbox(kind, query));
        if (seq === this.sequence) {
          this.submissions.set(result.items || []);
          this.total.set(result.totalCount);
        }
      }
    } catch {
      if (seq === this.sequence) this.error.set(true);
    } finally {
      if (seq === this.sequence) this.loading.set(false);
    }
  }
  openSource(id: string): void {
    if (!this.allowed(this.currentKind(), this.currentTab())) return;
    const type = this.currentTab();
    void this.router.navigate(['/diagnostics/doctor', this.currentKind()], {
      queryParams: {
        patientId: this.patientId(),
        view: type,
        [type === 'requests' ? 'requestId' : type === 'results' ? 'resultId' : 'submissionId']: id,
      },
    });
  }
}
