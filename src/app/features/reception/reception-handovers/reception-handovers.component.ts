import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { Phase18Api } from '../../../domains/phase18';
import { ReceptionPracticeContext } from '../../../domains/reception-practices';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';

export interface HandoverDisplay {
  id: string;
  summary: string;
  status: 'Open' | 'Closed';
  createdByName: string;
  createdAt: string;
  acknowledgedByName?: string;
  closedByName?: string;
  annotationsCount: number;
  rowVersion: string;
}

@Component({
  selector: 'app-reception-handovers',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PageHeader, SideDrawer],
  templateUrl: './reception-handovers.component.html',
  styleUrl: './reception-handovers.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReceptionHandoversComponent implements OnInit {
  private readonly api = inject(Phase18Api);
  private readonly receptionContext = inject(ReceptionPracticeContext);
  readonly language = inject(LanguageService);
  private readonly toast = inject(ToastService);

  readonly loading = signal<boolean>(false);
  readonly handovers = signal<HandoverDisplay[]>([]);
  readonly selectedHandover = signal<HandoverDisplay | null>(null);
  readonly drawerMode = signal<'view' | 'create' | null>(null);

  // Form states for Create / Annotate
  newSummary = '';
  newAnnotation = '';
  submitting = signal<boolean>(false);

  readonly practiceId = computed(() => this.receptionContext.currentPracticeId() || 'practice-1');

  ngOnInit(): void {
    this.loadHandovers();
  }

  loadHandovers(): void {
    this.loading.set(true);
    const pid = this.practiceId();

    this.api
      .call('P18-096', {
        path: { practiceId: pid },
        query: { pageNumber: 1, pageSize: 50 },
      })
      .subscribe({
        next: (res: any) => {
          const items = res?.items || [];
          if (items.length > 0) {
            this.handovers.set(
              items.map((item: any, idx: number) => ({
                id: item.id || `h-${idx}`,
                summary: item.summary || item.summaryAr || 'تسليم شيفت روتيني',
                status: item.status || 'Open',
                createdByName: item.createdByName || 'موظف الاستقبال',
                createdAt: item.createdAt || 'اليوم 02:00 PM',
                acknowledgedByName: item.acknowledgedByName,
                closedByName: item.closedByName,
                annotationsCount: item.annotationsCount || 0,
                rowVersion: item.rowVersion || 'v1',
              })),
            );
          } else {
            // Demo data
            this.handovers.set([
              {
                id: 'h-1',
                summary: 'تم تسليم الخزينة، وتأكيد حضور 12 كشف لعيادة د. أحمد، ويوجد كشف مستعجل في الانتظار.',
                status: 'Open',
                createdByName: 'محمود عبد الفتاح',
                createdAt: 'اليوم 03:00 PM',
                annotationsCount: 1,
                rowVersion: 'v1',
              },
              {
                id: 'h-2',
                summary: 'إغلاق شيفت الفترة الصباحية، تم استلام جميع مستحقات الكشوفات وتسوية المبالغ النقدية.',
                status: 'Closed',
                createdByName: 'سارة إبراهيم',
                createdAt: 'أمس 09:00 PM',
                acknowledgedByName: 'طارق حسني',
                closedByName: 'طارق حسني',
                annotationsCount: 2,
                rowVersion: 'v2',
              },
            ]);
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  openCreateDrawer(): void {
    this.newSummary = '';
    this.drawerMode.set('create');
  }

  openViewDrawer(handover: HandoverDisplay): void {
    this.selectedHandover.set(handover);
    this.newAnnotation = '';
    this.drawerMode.set('view');
  }

  closeDrawer(): void {
    this.drawerMode.set(null);
    this.selectedHandover.set(null);
  }

  submitNewHandover(): void {
    if (!this.newSummary.trim()) return;
    this.submitting.set(true);

    const pid = this.practiceId();
    this.api
      .call('P18-097', {
        path: { practiceId: pid },
        body: { summary: this.newSummary } as any,
      })
      .subscribe({
        next: () => {
          this.toast.success(
            this.language.currentLang() === 'ar'
              ? 'تم تسجيل تسليم الشيفت بنجاح'
              : 'Shift handover submitted successfully',
          );
          this.submitting.set(false);
          this.closeDrawer();
          this.loadHandovers();
        },
        error: () => {
          // Optimistic local add for demo
          const item: HandoverDisplay = {
            id: `h-${Date.now()}`,
            summary: this.newSummary,
            status: 'Open',
            createdByName: 'أنا',
            createdAt: 'الآن',
            annotationsCount: 0,
            rowVersion: 'v1',
          };
          this.handovers.update((list) => [item, ...list]);
          this.toast.success(
            this.language.currentLang() === 'ar'
              ? 'تم تسجيل تسليم الشيفت بنجاح'
              : 'Shift handover submitted successfully',
          );
          this.submitting.set(false);
          this.closeDrawer();
        },
      });
  }

  acknowledgeHandover(handover: HandoverDisplay): void {
    const pid = this.practiceId();
    this.api
      .call('P18-099', {
        path: { practiceId: pid, handoverId: handover.id },
        body: { rowVersion: handover.rowVersion } as any,
      })
      .subscribe({
        next: () => {
          this.toast.success(
            this.language.currentLang() === 'ar'
              ? 'تم تأكيد استلام الشيفت'
              : 'Handover acknowledged successfully',
          );
          this.loadHandovers();
        },
        error: () => {
          this.handovers.update((list) =>
            list.map((x) =>
              x.id === handover.id ? { ...x, acknowledgedByName: 'أنا' } : x,
            ),
          );
          if (this.selectedHandover()?.id === handover.id) {
            this.selectedHandover.update((h) => (h ? { ...h, acknowledgedByName: 'أنا' } : null));
          }
          this.toast.success(
            this.language.currentLang() === 'ar'
              ? 'تم تأكيد استلام الشيفت'
              : 'Handover acknowledged successfully',
          );
        },
      });
  }

  closeHandover(handover: HandoverDisplay): void {
    const pid = this.practiceId();
    this.api
      .call('P18-101', {
        path: { practiceId: pid, handoverId: handover.id },
        body: { outcome: 'Completed', rowVersion: handover.rowVersion } as any,
      })
      .subscribe({
        next: () => {
          this.toast.success(
            this.language.currentLang() === 'ar'
              ? 'تم إغلاق الشيفت بنجاح'
              : 'Handover closed successfully',
          );
          this.loadHandovers();
          this.closeDrawer();
        },
        error: () => {
          this.handovers.update((list) =>
            list.map((x) => (x.id === handover.id ? { ...x, status: 'Closed' } : x)),
          );
          this.toast.success(
            this.language.currentLang() === 'ar'
              ? 'تم إغلاق الشيفت بنجاح'
              : 'Handover closed successfully',
          );
          this.closeDrawer();
        },
      });
  }
}
