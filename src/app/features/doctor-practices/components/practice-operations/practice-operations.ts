import {
  ReservationConflictsComponent,
  ReservationConflict,
  reservationConflict,
} from '../../../../domains/reservations';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
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
import { parseApiErrors } from '../../../../core/auth/api-errors';
import {
  DoctorPractice,
  DoctorPracticeBranding,
  DoctorPracticeConfiguration,
} from '../../../../domains/doctor-practices';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import { ToastService } from '../../../../core/notifications/toast.service';

@Component({
  selector: 'app-practice-operations',
  imports: [ReservationConflictsComponent, FormField, TranslatePipe],
  templateUrl: './practice-operations.html',
  styleUrl: './practice-operations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeOperations implements OnInit, OnDestroy {
  protected readonly uiLanguage = inject(LanguageService);

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
  protected readonly reservationImpact = signal<ReservationConflict | null>(null);
  protected readonly configModel = signal({
    allowOnlineBooking: false,
    allowWalkIn: false,
    defaultSlotDurationMinutes: 0,
    checkInGracePeriodMinutes: 0,
    patientSelfCancellationCutoffMinutes: 0,
    maximumDailyPatients: '',
    maximumTicketCallAttempts: 0,
    noShowAfterPassedPatientsCount: 3,
    timeZoneId: '',
  });
  protected readonly configForm = form(this.configModel, (field) => {
    required(field.defaultSlotDurationMinutes, { message: 'ui.full.343' });
    min(field.defaultSlotDurationMinutes, 1, {
      message: 'ui.full.344',
    });
    max(field.defaultSlotDurationMinutes, 1440, { message: 'ui.full.345' });
    min(field.checkInGracePeriodMinutes, 0);
    min(field.patientSelfCancellationCutoffMinutes, 0);
    min(field.maximumTicketCallAttempts, 1);
    min(field.noShowAfterPassedPatientsCount, 1);
    required(field.timeZoneId, { message: 'ui.full.346' });
  });
  protected readonly brandingModel = signal({
    primaryColor: '',
    secondaryColor: '',
    backgroundColor: '',
    textColor: '',
  });
  protected readonly brandingForm = form(this.brandingModel, (field) => {
    const hex = /^$|^#[0-9A-Fa-f]{6}$/;
    pattern(field.primaryColor, hex, { message: 'practice.hexHelp' });
    pattern(field.secondaryColor, hex, { message: 'practice.hexHelp' });
    pattern(field.backgroundColor, hex, { message: 'ui.full.347' });
    pattern(field.textColor, hex, { message: 'ui.full.348' });
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
    const action = practice.isActive
      ? this.uiLanguage.t('common.deactivate')
      : this.uiLanguage.t('common.activate');
    const warning = practice.isActive
      ? this.uiLanguage.t('ui.full.349')
      : this.uiLanguage.t('ui.full.350');
    if (!window.confirm(`${action}\n${warning}`)) return;

    this.activeAction.set('status');
    this.messages.set([]);
    this.reservationImpact.set(null);
    try {
      const response = practice.isActive
        ? await firstValueFrom(
            this.api.deactivate(practice.id, { rowVersion: practice.rowVersion }),
          )
        : await firstValueFrom(this.api.activate(practice.id, { rowVersion: practice.rowVersion }));
      this.practiceChanged.emit(response);
      this.toast.success(
        practice.isActive ? this.uiLanguage.t('ui.full.351') : this.uiLanguage.t('ui.full.352'),
      );
    } catch (error) {
      this.reservationImpact.set(reservationConflict(error));
      this.messages.set(flattenErrors(error));
      this.toast.error(flattenErrors(error).join(' '));
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
      this.reservationImpact.set(null);
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
            noShowAfterPassedPatientsCount: value.noShowAfterPassedPatientsCount,
            timeZoneId: value.timeZoneId.trim(),
            rowVersion: current.rowVersion,
          }),
        );
        this.setConfiguration(response);
        this.toast.success(this.uiLanguage.t('ui.full.353'));
      } catch (error) {
        this.reservationImpact.set(reservationConflict(error));
        this.messages.set(flattenErrors(error));
        this.toast.error(flattenErrors(error).join(' '));
        if (error instanceof HttpErrorResponse && error.status === 409) {
          await this.loadConfiguration();
          this.toast.error(this.uiLanguage.t('ui.full.354'));
        }
      } finally {
        this.activeAction.set(null);
      }
    });
  }

  protected async removeLogo(): Promise<void> {
    const branding = this.branding();
    if (!branding || !branding.hasLogo || this.practice().isActive || this.activeAction()) return;
    if (!window.confirm(this.uiLanguage.t('ui.full.355'))) return;

    this.activeAction.set('logo');
    this.messages.set([]);
    this.reservationImpact.set(null);
    try {
      await firstValueFrom(
        this.api.removeLogo(this.practice().id, { rowVersion: branding.rowVersion }),
      );
      await Promise.all([this.loadBranding(), this.reloadPractice()]);
      this.toast.success(this.uiLanguage.t('ui.full.356'));
    } catch (error) {
      this.reservationImpact.set(reservationConflict(error));
      this.messages.set(flattenErrors(error));
      this.toast.error(flattenErrors(error).join(' '));
      if (error instanceof HttpErrorResponse && error.status === 409) {
        await Promise.all([this.loadBranding(), this.reloadPractice()]);
        this.toast.error(this.uiLanguage.t('ui.full.357'));
      }
    } finally {
      this.activeAction.set(null);
    }
  }

  protected chooseLogo(event: Event): void {
    this.selectedLogo.set((event.currentTarget as HTMLInputElement).files?.[0] ?? null);
  }

  protected onColorPicked(
    field: 'primaryColor' | 'secondaryColor' | 'backgroundColor' | 'textColor',
    event: Event,
  ): void {
    const input = event.target as HTMLInputElement;
    if (!input?.value) return;
    const hex = input.value.toUpperCase();
    this.brandingModel.update((model) => ({ ...model, [field]: hex }));
  }

  protected getValidHex(value: string | undefined | null, fallback: string): string {
    if (value && /^#[0-9A-Fa-f]{6}$/.test(value.trim())) {
      return value.trim();
    }
    return fallback;
  }

  protected async saveBranding(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.brandingForm, async () => {
      const current = this.branding();
      if (!current || this.activeAction()) return;
      this.activeAction.set('branding');
      this.messages.set([]);
      this.reservationImpact.set(null);
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
        this.toast.success(this.uiLanguage.t('ui.full.358'));
      } catch (error) {
        this.reservationImpact.set(reservationConflict(error));
        this.messages.set(flattenErrors(error));
        this.toast.error(flattenErrors(error).join(' '));
        if (error instanceof HttpErrorResponse && error.status === 409) {
          await this.loadBranding();
          this.toast.error(this.uiLanguage.t('ui.full.359'));
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
    this.reservationImpact.set(null);
    try {
      await firstValueFrom(this.api.replaceLogo(this.practice().id, file, current.rowVersion));
      this.selectedLogo.set(null);
      await Promise.all([this.loadBranding(), this.reloadPractice()]);
      this.toast.success(
        current.hasLogo ? this.uiLanguage.t('ui.full.360') : this.uiLanguage.t('ui.full.361'),
      );
    } catch (error) {
      this.reservationImpact.set(reservationConflict(error));
      this.messages.set(flattenErrors(error));
      this.toast.error(flattenErrors(error).join(' '));
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
      noShowAfterPassedPatientsCount: configuration.noShowAfterPassedPatientsCount,
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
