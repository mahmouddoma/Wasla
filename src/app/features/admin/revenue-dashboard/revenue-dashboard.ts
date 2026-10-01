import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { AdminRevenueAggregates, FinanceApi } from '../../../domains/finance';

@Component({
  selector: 'app-revenue-dashboard',
  imports: [FormField, TranslatePipe],
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

  async ngOnInit(): Promise<void> {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    this.model.set({ fromDate: this.date(first), toDate: this.date(today), doctorId: '', practiceId: '' });
    await this.load();
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
