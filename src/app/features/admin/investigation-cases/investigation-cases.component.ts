import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { Phase18Api } from '../../../domains/phase18';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';
import { createIdempotencyKey } from '../../../core/http/create-idempotency-key';

export interface InvestigationCaseDisplay {
  id: string;
  title: string;
  issueType: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  status: 'Open' | 'UnderReview' | 'Resolved' | 'Closed';
  assigneeName: string;
  createdAt: string;
  rowVersion: string;
}

@Component({
  selector: 'app-investigation-cases',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PageHeader, SideDrawer],
  templateUrl: './investigation-cases.component.html',
  styleUrl: './investigation-cases.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestigationCasesComponent implements OnInit {
  private readonly api = inject(Phase18Api);
  readonly language = inject(LanguageService);
  private readonly toast = inject(ToastService);

  readonly loading = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);
  readonly cases = signal<InvestigationCaseDisplay[]>([]);
  readonly selectedCase = signal<InvestigationCaseDisplay | null>(null);
  readonly drawerMode = signal<'view' | 'create' | null>(null);

  // Create form
  newTitle = '';
  newDescription = '';
  newIssueType = 'Operational';
  newPriority: 'Low' | 'Normal' | 'High' | 'Urgent' = 'Normal';
  readonly submitting = signal<boolean>(false);
  readonly formError = signal<string | null>(null);

  // Transition form
  transitionNotes = '';

  ngOnInit(): void {
    this.loadCases();
  }

  loadCases(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.api
      .call('P18-005', {
        query: { pageNumber: 1, pageSize: 50 },
      })
      .subscribe({
        next: (res: any) => {
          const items = Array.isArray(res?.items) ? res.items : [];
          this.cases.set(
            items.map((item: any, idx: number) => ({
              id: item.id || item.caseId || `case-${idx}`,
              title: item.title || item.titleAr || item.titleEn || `#${idx + 1}`,
              issueType: item.issueType || 'Operational',
              priority: item.priority || 'Normal',
              status: item.status || 'Open',
              assigneeName: item.assigneeName || '',
              createdAt: item.createdAt || item.createdOnUtc || '',
              rowVersion: item.rowVersion || '',
            })),
          );
          this.loading.set(false);
        },
        error: (err) => {
          const parsed = parseApiErrors(err);
          const msg = this.language.t(parsed.messages[0] || 'common.failedToLoad');
          this.loadError.set(msg);
          this.toast.error(msg);
          this.loading.set(false);
        },
      });
  }

  openCreateDrawer(): void {
    this.newTitle = '';
    this.newDescription = '';
    this.newIssueType = 'Operational';
    this.newPriority = 'Normal';
    this.formError.set(null);
    this.drawerMode.set('create');
  }

  openViewDrawer(c: InvestigationCaseDisplay): void {
    this.selectedCase.set(c);
    this.transitionNotes = '';
    this.drawerMode.set('view');
  }

  closeDrawer(): void {
    this.drawerMode.set(null);
    this.selectedCase.set(null);
    this.formError.set(null);
  }

  issueTypeLabel(issueType: string): string {
    const map: Record<string, string> = {
      Operational: 'investigations.category.operational',
      Billing: 'investigations.category.financial',
      Financial: 'investigations.category.financial',
      ClinicalConduct: 'investigations.category.clinical',
      Clinical: 'investigations.category.clinical',
      AccessBreach: 'investigations.category.security',
      Security: 'investigations.category.security',
      Compliance: 'investigations.category.compliance',
    };
    const key = map[issueType];
    return key ? this.language.t(key) : issueType;
  }

  priorityLabel(priority: string): string {
    const map: Record<string, string> = {
      Low: 'investigations.priority.low',
      Normal: 'investigations.priority.medium',
      Medium: 'investigations.priority.medium',
      High: 'investigations.priority.high',
      Urgent: 'investigations.priority.urgent',
    };
    const key = map[priority];
    return key ? this.language.t(key) : priority;
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      Open: 'investigations.status.open',
      UnderReview: 'investigations.status.underReview',
      Resolved: 'investigations.status.resolved',
      Closed: 'investigations.status.closed',
      Reopened: 'investigations.status.reopened',
    };
    const key = map[status];
    return key ? this.language.t(key) : status;
  }

  assigneeLabel(name: string): string {
    return name?.trim() ? name : this.language.t('common.unknown');
  }

  formatDate(value: string): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat(this.language.isRtl() ? 'ar-EG' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  }

  createCase(): void {
    if (!this.newTitle.trim()) {
      this.formError.set(this.language.t('investigations.validationTitleSummary'));
      return;
    }
    this.formError.set(null);
    this.submitting.set(true);

    this.api
      .call('P18-006', {
        idempotencyKey: createIdempotencyKey(),
        body: {
          titleAr: this.newTitle.trim(),
          description: this.newDescription.trim(),
          issueType: this.newIssueType as any,
          priority: this.newPriority as any,
        } as any,
      })
      .subscribe({
        next: () => {
          this.toast.success(this.language.t('investigations.createdSuccess'));
          this.submitting.set(false);
          this.closeDrawer();
          this.loadCases();
        },
        error: (err) => {
          const parsed = parseApiErrors(err);
          const msg = this.language.t(parsed.messages[0] || 'common.actionFailed');
          this.formError.set(msg);
          this.toast.error(msg);
          this.submitting.set(false);
        },
      });
  }

  startReview(c: InvestigationCaseDisplay): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.api
      .call('P18-013', {
        idempotencyKey: createIdempotencyKey(),
        path: { caseId: c.id },
        body: {
          notes: this.transitionNotes.trim() || this.language.t('investigations.startReview'),
          rowVersion: c.rowVersion,
        } as any,
      })
      .subscribe({
        next: () => {
          this.toast.success(this.language.t('investigations.reviewStartedSuccess'));
          this.submitting.set(false);
          this.updateCaseStatus(c.id, 'UnderReview');
          this.loadCases();
        },
        error: (err) => {
          const parsed = parseApiErrors(err);
          this.toast.error(this.language.t(parsed.messages[0] || 'common.actionFailed'));
          this.submitting.set(false);
        },
      });
  }

  resolveCase(c: InvestigationCaseDisplay): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.api
      .call('P18-012', {
        idempotencyKey: createIdempotencyKey(),
        path: { caseId: c.id },
        body: {
          outcome: 'Resolved',
          notes: this.transitionNotes.trim() || this.language.t('investigations.defaultResolveNote'),
          rowVersion: c.rowVersion,
        } as any,
      })
      .subscribe({
        next: () => {
          this.toast.success(this.language.t('investigations.resolvedSuccess'));
          this.submitting.set(false);
          this.updateCaseStatus(c.id, 'Resolved');
          this.loadCases();
        },
        error: (err) => {
          const parsed = parseApiErrors(err);
          this.toast.error(this.language.t(parsed.messages[0] || 'common.actionFailed'));
          this.submitting.set(false);
        },
      });
  }

  closeCase(c: InvestigationCaseDisplay): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.api
      .call('P18-009', {
        idempotencyKey: createIdempotencyKey(),
        path: { caseId: c.id },
        body: {
          outcome: 'Closed',
          notes: this.transitionNotes.trim() || this.language.t('investigations.defaultCloseNote'),
          rowVersion: c.rowVersion,
        } as any,
      })
      .subscribe({
        next: () => {
          this.toast.success(this.language.t('investigations.closedSuccess'));
          this.submitting.set(false);
          this.updateCaseStatus(c.id, 'Closed');
          this.loadCases();
        },
        error: (err) => {
          const parsed = parseApiErrors(err);
          this.toast.error(this.language.t(parsed.messages[0] || 'common.actionFailed'));
          this.submitting.set(false);
        },
      });
  }

  reopenCase(c: InvestigationCaseDisplay): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.api
      .call('P18-011', {
        idempotencyKey: createIdempotencyKey(),
        path: { caseId: c.id },
        body: {
          notes: this.transitionNotes.trim() || this.language.t('investigations.defaultReopenNote'),
          rowVersion: c.rowVersion,
        } as any,
      })
      .subscribe({
        next: () => {
          this.toast.success(this.language.t('investigations.reopenedSuccess'));
          this.submitting.set(false);
          this.updateCaseStatus(c.id, 'Open');
          this.loadCases();
        },
        error: (err) => {
          const parsed = parseApiErrors(err);
          this.toast.error(this.language.t(parsed.messages[0] || 'common.actionFailed'));
          this.submitting.set(false);
        },
      });
  }

  private updateCaseStatus(id: string, status: 'Open' | 'UnderReview' | 'Resolved' | 'Closed'): void {
    this.cases.update((list) =>
      list.map((x) => (x.id === id ? { ...x, status } : x)),
    );
    if (this.selectedCase()?.id === id) {
      this.selectedCase.update((c) => (c ? { ...c, status } : null));
    }
  }
}
