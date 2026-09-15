import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormField, form, max, min, pattern, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../core/auth/api-errors';
import {
  DoctorPractice,
  DoctorPracticeBranding,
  DoctorPracticeConfiguration,
} from '../../core/doctor-practices/doctor-practice.models';
import { DoctorPracticesApi } from '../../core/doctor-practices/doctor-practices-api';
import { ToastService } from '../../core/notifications/toast.service';

@Component({
  selector: 'app-practice-operations',
  imports: [FormField],
  templateUrl: './practice-operations.html',
  styleUrl: './practice-operations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeOperations implements OnInit, OnDestroy {
  readonly practice = input.required<DoctorPractice>();
  readonly canActivate = input(false);
  readonly canViewConfiguration = input(false);
  readonly canManageConfiguration = input(false);
  readonly canViewBranding = input(false);
  readonly canManageBranding = input(false);
  readonly practiceChanged = output<DoctorPractice>();

  private readonly api = inject(DoctorPracticesApi);
  private readonly toast = inject(ToastService);

  protected readonly configuration = signal<DoctorPracticeConfiguration | null>(null);
  protected readonly branding = signal<DoctorPracticeBranding | null>(null);
  protected readonly logoPreviewUrl = signal<string | null>(null);
  protected readonly selectedLogo = signal<File | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly activeAction = signal<'status' | 'configuration' | 'branding' | 'logo' | null>(
    null,
  );
  protected readonly messages = signal<string[]>([]);
  protected readonly configModel = signal({
    allowOnlineBooking: false,
    allowWalkIn: false,
    defaultSlotDurationMinutes: 0,
    checkInGracePeriodMinutes: 0,
    patientSelfCancellationCutoffMinutes: 0,
    maximumDailyPatients: '',
    maximumTicketCallAttempts: 0,
    timeZoneId: '',
  });
  protected readonly configForm = form(this.configModel, (field) => {
    required(field.defaultSlotDurationMinutes, { message: 'مدة الموعد الافتراضية مطلوبة.' });
    min(field.defaultSlotDurationMinutes, 1, {
      message: 'مدة الموعد يجب أن تكون دقيقة واحدة على الأقل.',
    });
    max(field.defaultSlotDurationMinutes, 1440, { message: 'مدة الموعد غير صالحة.' });
    min(field.checkInGracePeriodMinutes, 0);
    min(field.patientSelfCancellationCutoffMinutes, 0);
    min(field.maximumTicketCallAttempts, 1);
    required(field.timeZoneId, { message: 'المنطقة الزمنية مطلوبة.' });
  });
  protected readonly brandingModel = signal({
    primaryColor: '',
    secondaryColor: '',
    backgroundColor: '',
    textColor: '',
  });
  protected readonly brandingForm = form(this.brandingModel, (field) => {
    const hex = /^$|^#[0-9A-Fa-f]{6}$/;
    pattern(field.primaryColor, hex, { message: 'استخدم صيغة Hex مثل #008C8C.' });
    pattern(field.secondaryColor, hex, { message: 'استخدم صيغة Hex مثل #008C8C.' });
    pattern(field.backgroundColor, hex, { message: 'استخدم صيغة Hex مثل #FFFFFF.' });
    pattern(field.textColor, hex, { message: 'استخدم صيغة Hex مثل #102A43.' });
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  ngOnDestroy(): void {
    this.releaseLogoPreview();
  }

  protected async toggleStatus(): Promise<void> {
    if (this.activeAction()) return;
    const practice = this.practice();
    const action = practice.isActive ? 'إيقاف' : 'تفعيل';
    const warning = practice.isActive
      ? 'سيتم إيقاف العيادة تشغيليًا مع الاحتفاظ بتاريخها. هل تريد المتابعة؟'
      : 'التفعيل يتطلب اكتمال الإعدادات والهوية والشعار، ولا يعني أن العيادة متاحة للحجز. هل تريد المتابعة؟';
    if (!window.confirm(`${action} العيادة؟\n${warning}`)) return;

    this.activeAction.set('status');
    this.messages.set([]);
    try {
      const response = practice.isActive
        ? await firstValueFrom(
            this.api.deactivate(practice.id, { rowVersion: practice.rowVersion }),
          )
        : await firstValueFrom(this.api.activate(practice.id, { rowVersion: practice.rowVersion }));
      this.practiceChanged.emit(response);
      this.toast.success(practice.isActive ? 'تم إيقاف العيادة.' : 'تم تفعيل العيادة.');
    } catch (error) {
      this.messages.set(flattenErrors(error));
      if (error instanceof HttpErrorResponse && error.status === 409) await this.reloadPractice();
    } finally {
      this.activeAction.set(null);
    }
  }

  protected async saveConfiguration(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.configForm, async () => {
      const current = this.configuration();
      if (!current || this.activeAction()) return;
      this.activeAction.set('configuration');
      this.messages.set([]);
      try {
        const value = this.configModel();
        const response = await firstValueFrom(
          this.api.updateConfiguration(this.practice().id, {
            allowOnlineBooking: value.allowOnlineBooking,
            allowWalkIn: value.allowWalkIn,
            defaultSlotDurationMinutes: value.defaultSlotDurationMinutes,
            checkInGracePeriodMinutes: value.checkInGracePeriodMinutes,
            patientSelfCancellationCutoffMinutes: value.patientSelfCancellationCutoffMinutes,
            maximumDailyPatients: value.maximumDailyPatients.trim()
              ? Number(value.maximumDailyPatients)
              : null,
            maximumTicketCallAttempts: value.maximumTicketCallAttempts,
            timeZoneId: value.timeZoneId.trim(),
            rowVersion: current.rowVersion,
          }),
        );
        this.setConfiguration(response);
        this.toast.success('تم تحديث إعدادات العيادة.');
      } catch (error) {
        this.messages.set(flattenErrors(error));
        if (error instanceof HttpErrorResponse && error.status === 409) {
          await this.loadConfiguration();
          this.toast.error('تم تحميل أحدث إعدادات العيادة. راجعها ثم أعد الحفظ.');
        }
      } finally {
        this.activeAction.set(null);
      }
    });
  }

  protected async removeLogo(): Promise<void> {
    const branding = this.branding();
    if (!branding || !branding.hasLogo || this.practice().isActive || this.activeAction()) return;
    if (!window.confirm('حذف شعار العيادة؟ لن يمكن تفعيل العيادة بدون شعار.')) return;

    this.activeAction.set('logo');
    this.messages.set([]);
    try {
      await firstValueFrom(
        this.api.removeLogo(this.practice().id, { rowVersion: branding.rowVersion }),
      );
      await Promise.all([this.loadBranding(), this.reloadPractice()]);
      this.toast.success('تم حذف شعار العيادة.');
    } catch (error) {
      this.messages.set(flattenErrors(error));
      if (error instanceof HttpErrorResponse && error.status === 409) {
        await Promise.all([this.loadBranding(), this.reloadPractice()]);
        this.toast.error('تم تحميل أحدث بيانات الهوية. راجعها ثم أعد المحاولة.');
      }
    } finally {
      this.activeAction.set(null);
    }
  }

  protected chooseLogo(event: Event): void {
    this.selectedLogo.set((event.currentTarget as HTMLInputElement).files?.[0] ?? null);
  }

  protected async saveBranding(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.brandingForm, async () => {
      const current = this.branding();
      if (!current || this.activeAction()) return;
      this.activeAction.set('branding');
      this.messages.set([]);
      try {
        const value = this.brandingModel();
        const response = await firstValueFrom(
          this.api.updateBranding(this.practice().id, {
            primaryColor: nullableColor(value.primaryColor),
            secondaryColor: nullableColor(value.secondaryColor),
            backgroundColor: nullableColor(value.backgroundColor),
            textColor: nullableColor(value.textColor),
            rowVersion: current.rowVersion,
          }),
        );
        this.setBranding(response);
        this.toast.success('تم تحديث ألوان هوية العيادة.');
      } catch (error) {
        this.messages.set(flattenErrors(error));
        if (error instanceof HttpErrorResponse && error.status === 409) {
          await this.loadBranding();
          this.toast.error('تم تحميل أحدث بيانات الهوية. راجعها ثم أعد الحفظ.');
        }
      } finally {
        this.activeAction.set(null);
      }
    });
  }

  protected async uploadLogo(): Promise<void> {
    const current = this.branding();
    const file = this.selectedLogo();
    if (!current || !file || this.activeAction()) return;
    this.activeAction.set('logo');
    this.messages.set([]);
    try {
      await firstValueFrom(this.api.replaceLogo(this.practice().id, file, current.rowVersion));
      this.selectedLogo.set(null);
      await Promise.all([this.loadBranding(), this.reloadPractice()]);
      this.toast.success(current.hasLogo ? 'تم استبدال شعار العيادة.' : 'تم رفع شعار العيادة.');
    } catch (error) {
      this.messages.set(flattenErrors(error));
      if (error instanceof HttpErrorResponse && error.status === 409) await this.loadBranding();
    } finally {
      this.activeAction.set(null);
    }
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    const tasks: Promise<void>[] = [];
    if (this.canViewConfiguration() || this.canManageConfiguration()) {
      tasks.push(this.loadConfiguration());
    }
    if (this.canViewBranding() || this.canManageBranding()) tasks.push(this.loadBranding());
    await Promise.all(tasks);
    this.isLoading.set(false);
  }

  private async loadConfiguration(): Promise<void> {
    try {
      this.setConfiguration(await firstValueFrom(this.api.configuration(this.practice().id)));
    } catch (error) {
      this.messages.update((messages) => [...messages, ...flattenErrors(error)]);
    }
  }

  private async loadBranding(): Promise<void> {
    try {
      this.setBranding(await firstValueFrom(this.api.branding(this.practice().id)));
      await this.loadLogo();
    } catch (error) {
      this.messages.update((messages) => [...messages, ...flattenErrors(error)]);
    }
  }

  private setBranding(branding: DoctorPracticeBranding): void {
    this.branding.set(branding);
    this.brandingModel.set({
      primaryColor: branding.primaryColor ?? '',
      secondaryColor: branding.secondaryColor ?? '',
      backgroundColor: branding.backgroundColor ?? '',
      textColor: branding.textColor ?? '',
    });
    this.brandingForm().reset();
  }

  private async loadLogo(): Promise<void> {
    this.releaseLogoPreview();
    if (!this.branding()?.hasLogo) return;
    try {
      const media = await firstValueFrom(this.api.logo(this.practice().id));
      this.logoPreviewUrl.set(URL.createObjectURL(media.blob));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.branding.update((value) => (value ? { ...value, hasLogo: false } : value));
        return;
      }
      this.messages.update((messages) => [...messages, ...flattenErrors(error)]);
    }
  }

  private releaseLogoPreview(): void {
    const url = this.logoPreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.logoPreviewUrl.set(null);
  }

  private setConfiguration(configuration: DoctorPracticeConfiguration): void {
    this.configuration.set(configuration);
    this.configModel.set({
      allowOnlineBooking: configuration.allowOnlineBooking,
      allowWalkIn: configuration.allowWalkIn,
      defaultSlotDurationMinutes: configuration.defaultSlotDurationMinutes,
      checkInGracePeriodMinutes: configuration.checkInGracePeriodMinutes,
      patientSelfCancellationCutoffMinutes: configuration.patientSelfCancellationCutoffMinutes,
      maximumDailyPatients: configuration.maximumDailyPatients?.toString() ?? '',
      maximumTicketCallAttempts: configuration.maximumTicketCallAttempts,
      timeZoneId: configuration.timeZoneId,
    });
    this.configForm().reset();
  }

  private async reloadPractice(): Promise<void> {
    try {
      this.practiceChanged.emit(await firstValueFrom(this.api.details(this.practice().id)));
    } catch (error) {
      this.messages.update((messages) => [...messages, ...flattenErrors(error)]);
    }
  }
}

function nullableColor(value: string): string | null {
  return value.trim() ? value.trim().toUpperCase() : null;
}

function flattenErrors(error: unknown): string[] {
  const parsed = parseApiErrors(error);
  return [...parsed.messages, ...Object.values(parsed.fields).flat()];
}
