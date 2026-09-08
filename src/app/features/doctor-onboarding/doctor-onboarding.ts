import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../core/auth/api-errors';
import { AuthApi } from '../../core/auth/auth-api';
import { AuthSession } from '../../core/auth/auth-session';
import { PERMISSIONS } from '../../core/auth/permissions';
import { DoctorApi } from '../../core/doctors/doctor-api';
import { DoctorOnboardingStatus } from '../../core/doctors/doctor.models';

@Component({
  selector: 'app-doctor-onboarding',
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './doctor-onboarding.html',
  styleUrl: './doctor-onboarding.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorOnboarding {
  private readonly doctorApi = inject(DoctorApi);
  private readonly authApi = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  protected readonly status = signal<DoctorOnboardingStatus | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly canManageProfile = computed(
    () =>
      this.session.hasPermission(PERMISSIONS.doctorSpecializationsViewOwn) ||
      this.session.hasPermission(PERMISSIONS.doctorPracticeLocationManageOwn),
  );
  protected readonly approvedOn = computed(() => {
    const value = this.status()?.approvedOnUtc;
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en' : 'ar-EG', {
          dateStyle: 'long',
        }).format(date);
  });

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    if (this.isLoading() && this.status()) return;
    this.isLoading.set(true);
    this.apiMessages.set([]);
    try {
      const status = await firstValueFrom(this.doctorApi.onboardingStatus());
      this.status.set(status);
      if (status.approvalStatus === 'Approved') await this.openDoctorArea();
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.apiMessages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }

  private async openDoctorArea(): Promise<void> {
    const user = await firstValueFrom(this.authApi.currentUser());
    this.session.complete(user);
    const destination = this.session.destinationFor(user);
    if (destination !== '/doctor/onboarding') {
      await this.router.navigateByUrl(destination, { replaceUrl: true });
    }
  }
}
