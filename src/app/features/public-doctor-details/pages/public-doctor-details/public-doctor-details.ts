import { PatientBookingState, PatientBookingDrawerComponent } from '../../../patient-booking';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { LanguageSwitcher } from '../../../../shared/components/language-switcher/language-switcher';
import {
  PublicDiscoveryApi,
  PublicDoctorDetails,
  PublicPracticeSummary,
} from '../../../../domains/public-discovery';

@Component({
  selector: 'app-public-doctor-details',
  imports: [RouterLink, TranslatePipe, PageHeader, LanguageSwitcher, PatientBookingDrawerComponent],
  templateUrl: './public-doctor-details.html',
  styleUrl: './public-doctor-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicDoctorDetailsPage {
  protected readonly uiLanguage = inject(LanguageService);
  protected readonly authSession = inject(AuthSession);
  private readonly api = inject(PublicDiscoveryApi);
  private readonly route = inject(ActivatedRoute);
  private readonly doctorId = this.route.snapshot.paramMap.get('doctorId') ?? '';

  protected readonly booking = inject(PatientBookingState);
  protected readonly doctor = signal<PublicDoctorDetails | null>(null);
  protected readonly selectedPractice = computed(() => this.booking.practice());
  protected readonly isLoading = signal(true);
  protected readonly messages = signal<string[]>([]);
  protected readonly notFound = signal(false);
  protected readonly doctorImageBroken = signal(false);
  protected readonly brokenLogos = signal<string[]>([]);

  protected readonly isInsidePortal = computed(() => this.authSession.isAuthenticated());
  protected readonly userWorkspaceLink = computed(() => {
    const user = this.authSession.user();
    return user ? this.authSession.destinationFor(user) : '/workspace';
  });

  constructor() {
    void this.loadDoctor();
  }

  protected async choosePractice(practice: PublicPracticeSummary): Promise<void> {
    await this.booking.open({ doctorId: this.doctorId, doctorPracticeId: practice.id });
  }

  protected logoFailed(id: string): void {
    this.brokenLogos.update((ids) => [...new Set([...ids, id])]);
  }

  private async loadDoctor(): Promise<void> {
    try {
      const doc = await firstValueFrom(this.api.doctor(this.doctorId));
      this.doctor.set(doc);
      const query = this.route.snapshot.queryParamMap;
      if (query.has('practiceId') || query.has('date') || query.has('time')) {
        void this.booking.open({ doctorId: this.doctorId, doctorPracticeId: query.get('practiceId') ?? undefined,
          businessDate: query.get('date'), slotStartTime: query.get('time') });
      }
    } catch (error) {
      this.notFound.set(error instanceof HttpErrorResponse && error.status === 404);
      this.setErrors(error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private setErrors(error: unknown): void {
    if (error instanceof Error && error.message === 'discovery.invalidPractice') {
      this.messages.set(['discovery.invalidPractice']);
      return;
    }
    const parsed = parseApiErrors(error);
    this.messages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
  }
}
