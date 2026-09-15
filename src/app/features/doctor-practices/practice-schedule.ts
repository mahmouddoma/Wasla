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

  protected readonly schedule = signal<DoctorPracticeSchedule>({ periods: [], exceptions: [] });
  protected readonly effectivePeriods = signal<EffectiveSchedulePeriod[]>([]);
  protected readonly effectiveDate = signal(localDate());
  protected readonly editingPeriod = signal<DoctorPracticeSchedulePeriod | null>(null);
  protected readonly editingException = signal<DoctorPracticeScheduleException | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly activeAction = signal<string | null>(null);
  protected readonly messages = signal<string[]>([]);
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

  protected readonly days: ReadonlyArray<{ value: PracticeDayOfWeek; label: string }> = [
    { value: 'Saturday', label: 'السبت' },
    { value: 'Sunday', label: 'الأحد' },
    { value: 'Monday', label: 'الاثنين' },
    { value: 'Tuesday', label: 'الثلاثاء' },
    { value: 'Wednesday', label: 'الأربعاء' },
    { value: 'Thursday', label: 'الخميس' },
    { value: 'Friday', label: 'الجمعة' },
  ];

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadSchedule(), this.loadEffective()]);
    this.isLoading.set(false);
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

  protected editPeriod(period: DoctorPracticeSchedulePeriod): void {
    this.editingPeriod.set(period);
    this.periodModel.set({
      dayOfWeek: period.dayOfWeek,
      startTime: period.startTime,
      endTime: period.endTime,
      slotDurationMinutes: period.slotDurationMinutes,
    });
    this.periodForm().reset();
  }

  protected cancelPeriodEdit(): void {
    this.editingPeriod.set(null);
    this.periodModel.set({
      dayOfWeek: 'Sunday',
      startTime: '',
      endTime: '',
      slotDurationMinutes: 30,
    });
    this.periodForm().reset();
  }

  protected async savePeriod(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.periodForm, async () => {
      if (this.activeAction()) return;
      const value = this.periodModel();
      if (value.startTime >= value.endTime) {
        this.messages.set(['وقت النهاية يجب أن يكون بعد وقت البداية.']);
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
        this.toast.success(editing ? 'تم تحديث فترة العمل.' : 'تمت إضافة فترة العمل.');
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
  }

  protected cancelExceptionEdit(): void {
    this.editingException.set(null);
    this.exceptionModel.set({
      date: '',
      type: 'DayOff',
      startTime: '',
      endTime: '',
      slotDurationMinutes: 30,
    });
    this.exceptionForm().reset();
  }

  protected async saveException(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.exceptionForm, async () => {
      if (this.activeAction()) return;
      const request = this.exceptionRequest();
      if (!request) return;

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
    this.messages.set(flattenErrors(error));
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
