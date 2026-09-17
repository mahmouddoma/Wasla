import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormField, form, maxLength, min, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import {
  DoctorPracticePrice,
  DoctorPracticeSegment,
  DoctorPracticeVisitType,
} from '../../../../domains/doctor-practices';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import { ToastService } from '../../../../core/notifications/toast.service';

@Component({
  selector: 'app-practice-segments',
  imports: [FormField, TranslatePipe],
  templateUrl: './practice-segments.html',
  styleUrl: './practice-segments.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeSegments implements OnInit {
  protected readonly uiLanguage = inject(LanguageService);

  readonly practiceId = input.required<string>();
  readonly canViewSegments = input(true);
  readonly canManageSegments = input(false);
  readonly canViewPricing = input(false);
  readonly canManagePricing = input(false);

  private readonly api = inject(DoctorPracticesApi);
  private readonly toast = inject(ToastService);
  protected readonly segments = signal<DoctorPracticeSegment[]>([]);
  protected readonly visitTypes = signal<DoctorPracticeVisitType[]>([]);
  protected readonly prices = signal<DoctorPracticePrice[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly activeAction = signal<string | null>(null);
  protected readonly messages = signal<string[]>([]);
  protected readonly editingSegmentId = signal<string | null>(null);
  protected readonly editingVisitTypeId = signal<string | null>(null);
  protected readonly isAddingPrice = signal(false);
  protected readonly isAddingSegment = signal(false);
  protected readonly segmentModel = signal({
    nameAr: '',
    nameEn: '',
    priority: 0,
    reservedDailyQuota: '',
    quotaReleaseBeforeMinutes: '',
    isActive: true,
  });
  protected readonly segmentForm = form(this.segmentModel, (field) => {
    required(field.nameAr, { message: 'ui.full.478' });
    maxLength(field.nameAr, 200);
    maxLength(field.nameEn, 200);
    min(field.priority, 0);
  });
  protected readonly visitTypeModel = signal({ nameAr: '', nameEn: '', isActive: true });
  protected readonly visitTypeForm = form(this.visitTypeModel, (field) => {
    required(field.nameAr, { message: 'validation.nameArRequired' });
    maxLength(field.nameAr, 200);
    maxLength(field.nameEn, 200);
  });
  protected readonly priceModel = signal({ segmentId: '', visitTypeId: '', price: 0 });
  protected readonly priceForm = form(this.priceModel, (field) => {
    required(field.segmentId, { message: 'ui.full.479' });
    required(field.visitTypeId, { message: 'ui.full.480' });
    min(field.price, 0.01, { message: 'ui.full.481' });
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected openAddSegment(): void {
    this.cancelSegmentEdit();
    this.isAddingSegment.set(true);
  }

  protected editSegment(segment: DoctorPracticeSegment): void {
    this.editingSegmentId.set(segment.id);
    this.isAddingSegment.set(true);
    this.segmentModel.set({
      nameAr: segment.nameAr,
      nameEn: segment.nameEn ?? '',
      priority: segment.priority,
      reservedDailyQuota: segment.reservedDailyQuota?.toString() ?? '',
      quotaReleaseBeforeMinutes: segment.quotaReleaseBeforeMinutes?.toString() ?? '',
      isActive: segment.isActive,
    });
    this.segmentForm().reset();
  }

  protected cancelSegmentEdit(): void {
    this.editingSegmentId.set(null);
    this.isAddingSegment.set(false);
    this.segmentModel.set({
      nameAr: '',
      nameEn: '',
      priority: 0,
      reservedDailyQuota: '',
      quotaReleaseBeforeMinutes: '',
      isActive: true,
    });
    this.segmentForm().reset();
  }

  protected openAddPrice(): void {
    this.isAddingPrice.set(true);
    this.priceModel.set({ segmentId: '', visitTypeId: '', price: 0 });
    this.priceForm().reset();
  }

  protected closeAddPrice(): void {
    this.isAddingPrice.set(false);
    this.priceModel.set({ segmentId: '', visitTypeId: '', price: 0 });
    this.priceForm().reset();
  }

  protected async saveSegment(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.segmentForm, async () => {
      if (this.activeAction()) return;
      const value = this.segmentModel();
      const quota = nullableNumber(value.reservedDailyQuota);
      const release = nullableNumber(value.quotaReleaseBeforeMinutes);
      if ((quota === null) !== (release === null)) {
        this.messages.set([this.uiLanguage.t('ui.full.482')]);
        return;
      }
      this.activeAction.set('segment');
      this.messages.set([]);
      try {
        const editing = this.segments().find((item) => item.id === this.editingSegmentId());
        const request = {
          nameAr: value.nameAr.trim(),
          nameEn: value.nameEn.trim() || null,
          priority: value.priority,
          reservedDailyQuota: quota,
          quotaReleaseBeforeMinutes: release,
        };
        if (editing) {
          await firstValueFrom(
            this.api.updateSegment(this.practiceId(), editing.id, {
              ...request,
              isActive: editing.isDefault ? true : value.isActive,
              rowVersion: editing.rowVersion,
            }),
          );
        } else {
          await firstValueFrom(this.api.addSegment(this.practiceId(), request));
        }
        await this.loadSegments();
        this.cancelSegmentEdit();
        this.toast.success(editing ? this.uiLanguage.t('ui.full.483') : this.uiLanguage.t('ui.full.484'));
      } catch (error) {
        await this.handleMutationError(error, this.loadSegments.bind(this));
      } finally {
        this.activeAction.set(null);
      }
    });
  }

  protected editVisitType(item: DoctorPracticeVisitType): void {
    this.editingVisitTypeId.set(item.id);
    this.visitTypeModel.set({
      nameAr: item.nameAr,
      nameEn: item.nameEn ?? '',
      isActive: item.isActive,
    });
    this.visitTypeForm().reset();
  }

  protected async saveVisitType(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.visitTypeForm, async () => {
      const current = this.visitTypes().find((item) => item.id === this.editingVisitTypeId());
      if (!current || this.activeAction()) return;
      this.activeAction.set('visit-type');
      try {
        const value = this.visitTypeModel();
        await firstValueFrom(
          this.api.updateVisitType(this.practiceId(), current.id, {
            nameAr: value.nameAr.trim(),
            nameEn: value.nameEn.trim() || null,
            isActive: value.isActive,
            rowVersion: current.rowVersion,
          }),
        );
        await this.loadVisitTypes();
        this.editingVisitTypeId.set(null);
        this.toast.success(this.uiLanguage.t('ui.full.485'));
      } catch (error) {
        await this.handleMutationError(error, this.loadVisitTypes.bind(this));
      } finally {
        this.activeAction.set(null);
      }
    });
  }

  protected async addPrice(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.priceForm, async () => {
      if (this.activeAction()) return;
      this.activeAction.set('price');
      try {
        await firstValueFrom(this.api.addPrice(this.practiceId(), this.priceModel()));
        await this.loadPrices();
        this.priceModel.set({ segmentId: '', visitTypeId: '', price: 0 });
        this.priceForm().reset();
        this.isAddingPrice.set(false);
        this.toast.success(this.uiLanguage.t('ui.full.486'));
      } catch (error) {
        await this.handleMutationError(error, this.loadPrices.bind(this));
      } finally {
        this.activeAction.set(null);
      }
    });
  }

  protected async changePrice(item: DoctorPracticePrice): Promise<void> {
    const entered = window.prompt(this.uiLanguage.t('ui.full.487'), String(item.price));
    if (entered === null) return;
    const price = Number(entered);
    if (!Number.isFinite(price) || price <= 0) {
      this.messages.set([this.uiLanguage.t('ui.full.488')]);
      return;
    }
    this.activeAction.set(`price-${item.id}`);
    try {
      await firstValueFrom(
        this.api.updatePrice(this.practiceId(), item.id, { price, rowVersion: item.rowVersion }),
      );
      await this.loadPrices();
      this.toast.success(this.uiLanguage.t('ui.full.489'));
    } catch (error) {
      await this.handleMutationError(error, this.loadPrices.bind(this));
    } finally {
      this.activeAction.set(null);
    }
  }

  protected async deletePrice(item: DoctorPracticePrice): Promise<void> {
    if (!window.confirm(this.uiLanguage.t('ui.full.490'))) return;
    this.activeAction.set(`price-${item.id}`);
    try {
      await firstValueFrom(
        this.api.deletePrice(this.practiceId(), item.id, { rowVersion: item.rowVersion }),
      );
      await this.loadPrices();
      this.toast.success(this.uiLanguage.t('ui.full.491'));
    } catch (error) {
      await this.handleMutationError(error, this.loadPrices.bind(this));
    } finally {
      this.activeAction.set(null);
    }
  }

  protected segmentName(id: string): string {
    return this.segments().find((item) => item.id === id)?.nameAr ?? id;
  }
  protected visitTypeName(id: string): string {
    return this.visitTypes().find((item) => item.id === id)?.nameAr ?? id;
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    this.messages.set([]);
    const tasks: Promise<void>[] = [];
    if (
      this.canViewSegments() ||
      this.canManageSegments() ||
      this.canViewPricing() ||
      this.canManagePricing()
    )
      tasks.push(this.loadSegments());
    if (this.canViewPricing() || this.canManagePricing())
      tasks.push(this.loadVisitTypes(), this.loadPrices());
    await Promise.all(tasks);
    this.isLoading.set(false);
  }

  private async loadSegments(): Promise<void> {
    try {
      this.segments.set(await firstValueFrom(this.api.segments(this.practiceId())));
    } catch (error) {
      this.appendErrors(error);
    }
  }
  private async loadVisitTypes(): Promise<void> {
    try {
      this.visitTypes.set(await firstValueFrom(this.api.visitTypes(this.practiceId())));
    } catch (error) {
      this.appendErrors(error);
    }
  }
  private async loadPrices(): Promise<void> {
    try {
      this.prices.set(await firstValueFrom(this.api.prices(this.practiceId())));
    } catch (error) {
      this.appendErrors(error);
    }
  }

  private async handleMutationError(error: unknown, reload: () => Promise<void>): Promise<void> {
    this.messages.set(flattenErrors(error));
    if (error instanceof HttpErrorResponse && (error.status === 404 || error.status === 409)) {
      await reload();
      if (error.status === 409) this.toast.error(this.uiLanguage.t('ui.full.492'));
    }
  }
  private appendErrors(error: unknown): void {
    this.messages.update((messages) => [...messages, ...flattenErrors(error)]);
  }
}

function nullableNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}
function flattenErrors(error: unknown): string[] {
  const parsed = parseApiErrors(error);
  return [...parsed.messages, ...Object.values(parsed.fields).flat()];
}
