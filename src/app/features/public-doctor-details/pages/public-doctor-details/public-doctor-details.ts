import { PatientBookingState, PatientBookingDrawerComponent } from '../../../patient-booking';
import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import gsap from 'gsap';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { AuthSession } from '../../../../core/auth/auth-session';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { AppHeader } from '../../../../shared/components/app-header/app-header';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import {
  PublicDiscoveryApi,
  PublicDoctorDetails,
  PublicPracticeSummary,
} from '../../../../domains/public-discovery';

@Component({
  selector: 'app-public-doctor-details',
  imports: [RouterLink, TranslatePipe, AppHeader, PageHeader, PatientBookingDrawerComponent],
  templateUrl: './public-doctor-details.html',
  styleUrl: './public-doctor-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicDoctorDetailsPage {
  protected readonly uiLanguage = inject(LanguageService);
  protected readonly authSession = inject(AuthSession);
  private readonly api = inject(PublicDiscoveryApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
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
    afterNextRender(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    });
    effect(() => {
      const doc = this.doctor();
      const loading = this.isLoading();
      if (!loading && doc) {
        queueMicrotask(() => this.animateDetailsReveal());
      }
    });
    this.destroyRef.onDestroy(() => {
      const host = this.hostRef.nativeElement;
      gsap.killTweensOf(host.querySelectorAll('.doctor-profile-card, .practices-surface, .practice-card-row'));
    });
    void this.loadDoctor();
  }

  protected logout(): void {
    this.authSession.clear();
    void this.router.navigate(['/login']);
  }

  private animateDetailsReveal(): void {
    if (
      typeof window === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const host = this.hostRef.nativeElement;
    const surfaces = host.querySelectorAll('.doctor-profile-card, .practices-surface');
    if (surfaces.length) {
      gsap.fromTo(
        surfaces,
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform,opacity' },
      );
    }
    const rows = host.querySelectorAll('.practice-card-row');
    if (rows.length) {
      gsap.fromTo(
        rows,
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.42, stagger: 0.06, delay: 0.08, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform,opacity' },
      );
    }
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
