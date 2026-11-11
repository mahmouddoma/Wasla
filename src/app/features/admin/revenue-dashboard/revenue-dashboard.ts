import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { AdminRevenueAggregates, FinanceApi } from '../../../domains/finance';

import { PageHeader } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-revenue-dashboard',
  imports: [FormField, TranslatePipe, PageHeader],
  templateUrl: './revenue-dashboard.html',
  styleUrl: './revenue-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevenueDashboard implements OnInit {
  private readonly api = inject(FinanceApi);
  protected readonly language = inject(LanguageService);
  protected readonly data = signal<AdminRevenueAggregates | null>(null);
  protected readonly loading = signal(false);
  protected readonly messages = signal<readonly string[]>([]);
  protected readonly model = signal({ fromDate: '', toDate: '', doctorId: '', practiceId: '' });
  protected readonly filters = form(this.model);
  protected readonly activePreset = signal<'thisMonth' | 'last30Days' | 'lastMonth' | 'thisYear' | 'custom'>('thisMonth');

  protected readonly hasActiveFilters = computed(
    () => !!this.model().doctorId.trim() || !!this.model().practiceId.trim() || this.activePreset() === 'custom',
  );

  async ngOnInit(): Promise<void> {
    this.applyPreset('thisMonth', false);
    await this.load();
  }

  protected setPreset(preset: 'thisMonth' | 'last30Days' | 'lastMonth' | 'thisYear'): void {
    this.applyPreset(preset, true);
  }

  private applyPreset(preset: 'thisMonth' | 'last30Days' | 'lastMonth' | 'thisYear', triggerLoad = true): void {
    const today = new Date();
    let from: Date;
    let to: Date = today;

    if (preset === 'thisMonth') {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === 'lastMonth') {
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (preset === 'last30Days') {
      from = new Date();
      from.setDate(today.getDate() - 30);
    } else {
      from = new Date(today.getFullYear(), 0, 1);
    }

    this.activePreset.set(preset);
    this.model.update((m) => ({
      ...m,
      fromDate: this.date(from),
      toDate: this.date(to),
    }));

    if (triggerLoad) {
      void this.load();
    }
  }

  protected onDateChange(): void {
    this.activePreset.set('custom');
  }

  protected clearFilters(): void {
    this.model.update((m) => ({ ...m, doctorId: '', practiceId: '' }));
    this.applyPreset('thisMonth', true);
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.messages.set([]);
    const value = this.model();
    try {
      this.data.set(await firstValueFrom(this.api.adminRevenue(value.fromDate, value.toDate, value.doctorId.trim(), value.practiceId.trim())));
    } catch (error) {
      const parsed = parseApiErrors(error);
      const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
      this.messages.set(messages.length ? messages : ['finance.loadFailed']);
    } finally {
      this.loading.set(false);
    }
  }

  protected label(ar: string, en?: string | null): string {
    return this.language.currentLang() === 'en' ? en || ar : ar;
  }

  private date(value: Date): string {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
}
