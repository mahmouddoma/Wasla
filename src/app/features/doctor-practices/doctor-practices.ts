import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../core/auth/api-errors';
import { AuthSession } from '../../core/auth/auth-session';
import { PERMISSIONS } from '../../core/auth/permissions';
import { DoctorPractice } from '../../core/doctor-practices/doctor-practice.models';
import { DoctorPracticesApi } from '../../core/doctor-practices/doctor-practices-api';
import { PracticeEditor } from './practice-editor';
import { PracticeOperations } from './practice-operations';
import { PracticeSchedule } from './practice-schedule';
import { PracticeSegments } from './practice-segments';

type PracticeSection = 'overview' | 'operations' | 'schedule' | 'segments';

@Component({
  selector: 'app-doctor-practices',
  imports: [RouterLink, PracticeEditor, PracticeOperations, PracticeSchedule, PracticeSegments],
  templateUrl: './doctor-practices.html',
  styleUrls: ['../healthcare-workspace.css', './doctor-practices.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorPractices {
  private readonly api = inject(DoctorPracticesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  protected readonly practices = signal<DoctorPractice[]>([]);
  protected readonly selectedPractice = signal<DoctorPractice | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly messages = signal<string[]>([]);
  protected readonly isNotFound = signal(false);
  protected readonly isForbidden = signal(false);
  protected readonly practiceId = this.route.snapshot.paramMap.get('practiceId');
  protected readonly isCreate = this.route.snapshot.routeConfig?.path === 'doctor/practices/new';
  protected readonly activeSection = signal<PracticeSection>(
    parseSection(this.route.snapshot.fragment),
  );

  protected readonly canManage = this.session.hasPermission(PERMISSIONS.doctorPracticesManageOwn);
  protected readonly canActivate = this.session.hasPermission(
    PERMISSIONS.doctorPracticesActivateOwn,
  );
  protected readonly canViewConfiguration = this.session.hasPermission(
    PERMISSIONS.doctorPracticeConfigurationViewOwn,
  );
  protected readonly canManageConfiguration = this.session.hasPermission(
    PERMISSIONS.doctorPracticeConfigurationManageOwn,
  );
  protected readonly canViewBranding = this.session.hasPermission(
    PERMISSIONS.doctorPracticeBrandingViewOwn,
  );
  protected readonly canManageBranding = this.session.hasPermission(
    PERMISSIONS.doctorPracticeBrandingManageOwn,
  );
  protected readonly canViewSchedule = this.session.hasPermission(
    PERMISSIONS.doctorPracticeScheduleViewOwn,
  );
  protected readonly canManageSchedule = this.session.hasPermission(
    PERMISSIONS.doctorPracticeScheduleManageOwn,
  );
  protected readonly canViewSegments = this.session.hasPermission(
    PERMISSIONS.doctorPracticeSegmentsViewOwn,
  );
  protected readonly canManageSegments = this.session.hasPermission(
    PERMISSIONS.doctorPracticeSegmentsManageOwn,
  );
  protected readonly canViewPricing = this.session.hasPermission(
    PERMISSIONS.doctorPracticePricingViewOwn,
  );
  protected readonly canManagePricing = this.session.hasPermission(
    PERMISSIONS.doctorPracticePricingManageOwn,
  );

  constructor() {
    if (!this.isSectionAvailable(this.activeSection())) {
      this.activeSection.set('overview');
    }

    if (this.practiceId) void this.loadDetails();
    else if (!this.isCreate) void this.loadList();
    else this.isLoading.set(false);
  }

  protected selectSection(section: PracticeSection): void {
    if (!this.isSectionAvailable(section)) return;
    this.activeSection.set(section);
  }

  private isSectionAvailable(section: PracticeSection): boolean {
    if (section === 'operations') {
      return (
        this.canActivate ||
        this.canViewConfiguration ||
        this.canManageConfiguration ||
        this.canViewBranding ||
        this.canManageBranding
      );
    }
    if (section === 'schedule') return this.canViewSchedule || this.canManageSchedule;
    if (section === 'segments') {
      return (
        this.canViewSegments ||
        this.canManageSegments ||
        this.canViewPricing ||
        this.canManagePricing
      );
    }
    return true;
  }

  protected async loadList(): Promise<void> {
    this.resetRequestState();
    try {
      this.practices.set(await firstValueFrom(this.api.list()));
    } catch (error) {
      this.handleLoadError(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async loadDetails(): Promise<void> {
    if (!this.practiceId) return;
    this.resetRequestState();
    try {
      this.selectedPractice.set(await firstValueFrom(this.api.details(this.practiceId)));
    } catch (error) {
      this.handleLoadError(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected practiceSaved(practice: DoctorPractice): void {
    if (this.isCreate) {
      void this.router.navigate(['/doctor/practices', practice.id], { fragment: 'operations' });
      return;
    }
    this.selectedPractice.set(practice);
  }

  protected locationLabel(practice: DoctorPractice): string {
    return [
      practice.location.governorate?.nameAr,
      practice.location.city?.nameAr,
      practice.location.area?.nameAr,
    ]
      .filter(Boolean)
      .join('، ');
  }

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }

  private resetRequestState(): void {
    this.isLoading.set(true);
    this.messages.set([]);
    this.isNotFound.set(false);
    this.isForbidden.set(false);
  }

  private handleLoadError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      this.isNotFound.set(error.status === 404);
      this.isForbidden.set(error.status === 403);
    }
    if (!this.isNotFound() && !this.isForbidden()) {
      const parsed = parseApiErrors(error);
      this.messages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
    }
  }
}

function parseSection(fragment: string | null): PracticeSection {
  return ['overview', 'operations', 'schedule', 'segments'].includes(fragment ?? '')
    ? (fragment as PracticeSection)
    : 'overview';
}
