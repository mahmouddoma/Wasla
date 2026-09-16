import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormField, form, max, min, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../core/auth/api-errors';
import {
  DoctorPracticeSchedule,
  DoctorPracticeScheduleException,
  DoctorPracticeSchedulePeriod,
  EffectiveSchedulePeriod,
  PracticeDayOfWeek,
  ScheduleExceptionType,
  WriteScheduleExceptionRequest,
} from '../../core/doctor-practices/doctor-practice.models';
import { DoctorPracticesApi } from '../../core/doctor-practices/doctor-practices-api';
import { ToastService } from '../../core/notifications/toast.service';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-practice-schedule',
  imports: [FormField],
  templateUrl: './practice-schedule.html',
  styleUrl: './practice-schedule.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeSchedule implements OnInit {
  readonly practiceId = input.required<string>();
  readonly canManage = input(false);

  private readonly api = inject(DoctorPracticesApi);
  private readonly toast = inject(ToastService);
  private readonly language = inject(LanguageService);

  protected readonly schedule = signal<DoctorPracticeSchedule>({ periods: [], exceptions: [] });
  protected readonly effectivePeriods = signal<EffectiveSchedulePeriod[]>([]);
  protected readonly effectiveDate = signal(localDate());
  protected readonly editingPeriod = signal<DoctorPracticeSchedulePeriod | null>(null);
  protected readonly editingException = signal<DoctorPracticeScheduleException | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly activeAction = signal<string | null>(null);
  protected readonly messages = signal<string[]>([]);
  protected readonly periodFeedback = signal<string | null>(null);
  protected readonly periodModel = signal({
    dayOfWeek: 'Sunday' as PracticeDayOfWeek,
    startTime: '',
    endTime: '',
    slotDurationMinutes: 30,
  });
  protected readonly periodForm = form(this.periodModel, (field) => {
    required(field.dayOfWeek);
    required(field.startTime, { message: 'وقت البداية مطلوب.' });
    required(field.endTime, { message: 'وقت النهاية مطلوب.' });
    min(field.slotDurationMinutes, 1);
    max(field.slotDurationMinutes, 1440);
  });
  protected readonly exceptionModel = signal({
    date: '',
    type: 'DayOff' as ScheduleExceptionType,
    startTime: '',
    endTime: '',
    slotDurationMinutes: 30,
  });
  protected readonly exceptionForm = form(this.exceptionModel, (field) => {
    required(field.date, { message: 'تاريخ الاستثناء مطلوب.' });
    required(field.type);
  });

  protected readonly isPeriodModalOpen = signal(false);
  protected readonly isExceptionModalOpen = signal(false);

  // 12-Hour picker signals
  protected readonly hoursList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
  protected readonly minutesList = ['00', '15', '30', '45'] as const;

  protected readonly startHour = signal<number>(5);
  protected readonly startMinute = signal<string>('00');
  protected readonly startPeriod = signal<'AM' | 'PM'>('PM');

  protected readonly endHour = signal<number>(10);
  protected readonly endMinute = signal<string>('00');
  protected readonly endPeriod = signal<'AM' | 'PM'>('PM');

  protected readonly days: ReadonlyArray<{
    value: PracticeDayOfWeek;
    label: string;
    short: string;
  }> = [
    { value: 'Saturday', label: 'السبت', short: 'سبت' },
    { value: 'Sunday', label: 'الأحد', short: 'أحد' },
    { value: 'Monday', label: 'الاثنين', short: 'اثنين' },
    { value: 'Tuesday', label: 'الثلاثاء', short: 'ثلاثاء' },
    { value: 'Wednesday', label: 'الأربعاء', short: 'أربعاء' },
    { value: 'Thursday', label: 'الخميس', short: 'خميس' },
    { value: 'Friday', label: 'الجمعة', short: 'جمعة' },
  ];

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadSchedule(), this.loadEffective()]);
    this.isLoading.set(false);
  }

  protected formatTime(time: string | null | undefined): string {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (isNaN(hours)) return time;
    const isArabic = this.language.currentLang() === 'ar';
    const period = hours >= 12 ? (isArabic ? 'م' : 'PM') : isArabic ? 'ص' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const paddedHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${paddedHours}:${minutes} ${period}`;
  }

  protected getPeriodsForDay(day: PracticeDayOfWeek): DoctorPracticeSchedulePeriod[] {
    return this.schedule().periods.filter((p) => p.dayOfWeek === day);
  }

  protected get activeDaysCount(): number {
    return new Set(this.schedule().periods.map((p) => p.dayOfWeek)).size;
  }

  protected dayLabel(value: PracticeDayOfWeek): string {
    return this.days.find((day) => day.value === value)?.label ?? value;
  }

  protected exceptionLabel(value: ScheduleExceptionType): string {
    return (
      {
        DayOff: 'يوم إجازة',
        Vacation: 'عطلة',
        CustomWorkingHours: 'ساعات عمل مخصصة',
        BlockedTimeRange: 'فترة محجوبة',
      } as const
    )[value];
  }

  protected exceptionNeedsTimes(): boolean {
    return ['CustomWorkingHours', 'BlockedTimeRange'].includes(this.exceptionModel().type);
  }

  protected exceptionNeedsDuration(): boolean {
    return this.exceptionModel().type === 'CustomWorkingHours';
  }

  protected effectiveDateChanged(event: Event): void {
    this.effectiveDate.set((event.currentTarget as HTMLInputElement).value);
  }

  protected async loadEffective(): Promise<void> {
    if (!this.effectiveDate()) return;
    this.activeAction.set('effective');
    try {
      this.effectivePeriods.set(
        await firstValueFrom(this.api.effectiveSchedule(this.practiceId(), this.effectiveDate())),
      );
    } catch (error) {
      this.messages.set(flattenErrors(error));
    } finally {
      this.activeAction.set(null);
    }
  }

  // 12-Hour Converter Helpers
  private to24Hour(hour: number, minute: string, period: 'AM' | 'PM'): string {
    let h = hour % 12;
    if (period === 'PM') h += 12;
    const hh = h < 10 ? `0${h}` : `${h}`;
    return `${hh}:${minute}`;
  }

  private parseTo12Hour(time24: string): { hour: number; minute: string; period: 'AM' | 'PM' } {
    if (!time24) return { hour: 5, minute: '00', period: 'PM' };
    const parts = time24.split(':');
    let h = parseInt(parts[0], 10) || 0;
    const m = parts[1] ? parts[1].slice(0, 2) : '00';
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return { hour: h, minute: m, period };
  }

  protected setStartHour(h: number | string): void {
    this.startHour.set(Number(h));
    this.syncStartToModel();
  }

  protected setStartMinute(m: string): void {
    this.startMinute.set(m);
    this.syncStartToModel();
  }

  protected setStartPeriod(p: 'AM' | 'PM'): void {
    this.startPeriod.set(p);
    this.syncStartToModel();
  }

  protected setEndHour(h: number | string): void {
    this.endHour.set(Number(h));
    this.syncEndToModel();
  }

  protected setEndMinute(m: string): void {
    this.endMinute.set(m);
    this.syncEndToModel();
  }

  protected setEndPeriod(p: 'AM' | 'PM'): void {
    this.endPeriod.set(p);
    this.syncEndToModel();
  }

  private syncStartToModel(): void {
    const time24 = this.to24Hour(this.startHour(), this.startMinute(), this.startPeriod());
    this.periodModel.update((m) => ({ ...m, startTime: time24 }));
  }

  private syncEndToModel(): void {
    const time24 = this.to24Hour(this.endHour(), this.endMinute(), this.endPeriod());
    this.periodModel.update((m) => ({ ...m, endTime: time24 }));
  }

  protected applyPreset(start: string, end: string, duration = 30): void {
    const s = this.parseTo12Hour(start);
    this.startHour.set(s.hour);
    this.startMinute.set(s.minute);
    this.startPeriod.set(s.period);

    const e = this.parseTo12Hour(end);
    this.endHour.set(e.hour);
    this.endMinute.set(e.minute);
    this.endPeriod.set(e.period);

    this.periodModel.update((m) => ({
      ...m,
      startTime: start,
      endTime: end,
      slotDurationMinutes: duration,
    }));
  }

  // Modal actions
  protected openAddPeriodModal(day?: PracticeDayOfWeek): void {
    this.cancelPeriodEdit();
    if (day) {
      this.periodModel.update((m) => ({ ...m, dayOfWeek: day }));
    }
    this.applyPreset('17:00', '22:00', 30);
    this.isPeriodModalOpen.set(true);
  }

  protected closePeriodModal(): void {
    this.cancelPeriodEdit();
    this.isPeriodModalOpen.set(false);
  }

  protected editPeriod(period: DoctorPracticeSchedulePeriod): void {
    this.editingPeriod.set(period);
    const s = this.parseTo12Hour(period.startTime);
    this.startHour.set(s.hour);
    this.startMinute.set(s.minute);
    this.startPeriod.set(s.period);

    const e = this.parseTo12Hour(period.endTime);
    this.endHour.set(e.hour);
    this.endMinute.set(e.minute);
    this.endPeriod.set(e.period);

    this.periodModel.set({
      dayOfWeek: period.dayOfWeek,
      startTime: period.startTime,
      endTime: period.endTime,
      slotDurationMinutes: period.slotDurationMinutes,
    });
    this.periodForm().reset();
    this.isPeriodModalOpen.set(true);
  }

  protected cancelPeriodEdit(): void {
    this.periodFeedback.set(null);
    this.editingPeriod.set(null);
    this.isPeriodModalOpen.set(false);
    this.periodModel.set({
      dayOfWeek: 'Sunday',
      startTime: '',
      endTime: '',
      slotDurationMinutes: 30,
    });
    this.periodForm().reset();
  }

  protected openAddExceptionModal(): void {
    this.cancelExceptionEdit();
    this.isExceptionModalOpen.set(true);
  }

  protected closeExceptionModal(): void {
    this.cancelExceptionEdit();
    this.isExceptionModalOpen.set(false);
  }

  protected editException(exception: DoctorPracticeScheduleException): void {
    this.editingException.set(exception);
    this.exceptionModel.set({
      date: exception.date,
      type: exception.type,
      startTime: exception.startTime ?? '',
      endTime: exception.endTime ?? '',
      slotDurationMinutes: exception.slotDurationMinutes ?? 30,
    });
    this.exceptionForm().reset();
    this.isExceptionModalOpen.set(true);
  }

  protected cancelExceptionEdit(): void {
    this.editingException.set(null);
    this.isExceptionModalOpen.set(false);
    this.exceptionModel.set({
      date: '',
      type: 'DayOff',
      startTime: '',
      endTime: '',
      slotDurationMinutes: 30,
    });
    this.exceptionForm().reset();
  }

  protected async savePeriod(event: Event): Promise<void> {
    event.preventDefault();
    if (this.activeAction()) return;
    this.periodFeedback.set(null);
    if (this.periodForm().invalid()) {
      await submit(this.periodForm, async () => {});
      const message = this.language.t('schedule.invalidPeriod');
      this.periodFeedback.set(message);
      this.toast.error(message);
      return;
    }
    await submit(this.periodForm, async () => {
      if (this.activeAction()) return;
      const value = this.periodModel();
      if (value.startTime >= value.endTime) {
        const message = this.language.t('schedule.invalidTimeOrder');
        this.periodFeedback.set(message);
        this.toast.error(message);
        return;
      }

      this.activeAction.set('period');
      this.messages.set([]);
      try {
        const editing = this.editingPeriod();
        if (editing) {
          await firstValueFrom(
            this.api.updatePeriod(this.practiceId(), editing.id, {
              ...value,
              rowVersion: editing.rowVersion,
            }),
          );
        } else {
          await firstValueFrom(this.api.addPeriod(this.practiceId(), value));
        }
        this.cancelPeriodEdit();
        await this.refreshScheduleViews();
        this.toast.success(
          this.language.t(editing ? 'schedule.periodUpdated' : 'schedule.periodAdded'),
        );
      } catch (error) {
        await this.handleMutationError(error);
      } finally {
        this.activeAction.set(null);
      }
    });
  }

  protected async deletePeriod(period: DoctorPracticeSchedulePeriod): Promise<void> {
    if (this.activeAction() || !window.confirm('حذف فترة العمل المتكررة؟')) return;
    this.activeAction.set(`period-${period.id}`);
    this.messages.set([]);
    try {
      await firstValueFrom(
        this.api.deletePeriod(this.practiceId(), period.id, { rowVersion: period.rowVersion }),
      );
      await this.refreshScheduleViews();
      this.toast.success('تم حذف فترة العمل.');
    } catch (error) {
      await this.handleMutationError(error);
    } finally {
      this.activeAction.set(null);
    }
  }

  protected async saveException(event: Event): Promise<void> {
    event.preventDefault();
    if (this.activeAction()) return;
    if (this.exceptionForm().invalid()) {
      await submit(this.exceptionForm, async () => {});
      const message = this.language.t('schedule.invalidException');
      this.messages.set([message]);
      this.toast.error(message);
      return;
    }
    await submit(this.exceptionForm, async () => {
      if (this.activeAction()) return;
      const request = this.exceptionRequest();
      if (!request) {
        this.toast.error(this.messages().join(' '));
        return;
      }

      this.activeAction.set('exception');
      this.messages.set([]);
      try {
        const editing = this.editingException();
        if (editing) {
          await firstValueFrom(
            this.api.updateException(this.practiceId(), editing.id, {
              ...request,
              rowVersion: editing.rowVersion,
            }),
          );
        } else {
          await firstValueFrom(this.api.addException(this.practiceId(), request));
        }
        this.effectiveDate.set(request.date);
        this.cancelExceptionEdit();
        await this.refreshScheduleViews();
        this.toast.success(editing ? 'تم تحديث الاستثناء.' : 'تمت إضافة الاستثناء.');
      } catch (error) {
        await this.handleMutationError(error);
      } finally {
        this.activeAction.set(null);
      }
    });
  }

  protected async deleteException(exception: DoctorPracticeScheduleException): Promise<void> {
    if (this.activeAction() || !window.confirm('حذف استثناء الجدول؟')) return;
    this.activeAction.set(`exception-${exception.id}`);
    this.messages.set([]);
    try {
      await firstValueFrom(
        this.api.deleteException(this.practiceId(), exception.id, {
          rowVersion: exception.rowVersion,
        }),
      );
      this.effectiveDate.set(exception.date);
      await this.refreshScheduleViews();
      this.toast.success('تم حذف الاستثناء.');
    } catch (error) {
      await this.handleMutationError(error);
    } finally {
      this.activeAction.set(null);
    }
  }

  private exceptionRequest(): WriteScheduleExceptionRequest | null {
    const value = this.exceptionModel();
    const needsTimes = this.exceptionNeedsTimes();
    if (needsTimes && (!value.startTime || !value.endTime || value.startTime >= value.endTime)) {
      this.messages.set(['أدخل وقت بداية ونهاية صحيحين لهذا النوع من الاستثناء.']);
      return null;
    }
    if (this.exceptionNeedsDuration() && value.slotDurationMinutes < 1) {
      this.messages.set(['مدة الموعد مطلوبة لساعات العمل المخصصة.']);
      return null;
    }
    return {
      date: value.date,
      type: value.type,
      startTime: needsTimes ? value.startTime : null,
      endTime: needsTimes ? value.endTime : null,
      slotDurationMinutes: this.exceptionNeedsDuration() ? value.slotDurationMinutes : null,
    };
  }

  private async loadSchedule(): Promise<void> {
    try {
      this.schedule.set(await firstValueFrom(this.api.schedule(this.practiceId())));
    } catch (error) {
      this.messages.set(flattenErrors(error));
    }
  }

  private async refreshScheduleViews(): Promise<void> {
    await Promise.all([this.loadSchedule(), this.loadEffective()]);
  }

  private async handleMutationError(error: unknown): Promise<void> {
    const messages = flattenErrors(error);
    this.messages.set(messages);
    this.toast.error(messages.join(' ') || this.language.t('schedule.mutationFailed'));
    if (error instanceof HttpErrorResponse && [404, 409].includes(error.status)) {
      this.cancelPeriodEdit();
      this.cancelExceptionEdit();
      await this.refreshScheduleViews();
      if (error.status === 409) {
        this.toast.error('تم تحميل أحدث جدول. راجعه ثم أعد المحاولة.');
      }
    }
  }
}

function flattenErrors(error: unknown): string[] {
  const parsed = parseApiErrors(error);
  return [...parsed.messages, ...Object.values(parsed.fields).flat()];
}

function localDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
