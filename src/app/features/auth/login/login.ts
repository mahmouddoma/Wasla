import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import gsap from 'gsap';
import { filter, firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthApi } from '../../../core/auth/auth-api';
import { AuthSession } from '../../../core/auth/auth-session';
import { resolveReturnUrl } from '../../../core/auth/return-navigation';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ToastService } from '../../../core/notifications/toast.service';
import { DoctorApi } from '../../../domains/doctors';
import { SubscriptionState } from '../../../domains/subscriptions';
import { DoctorRegistration } from '../doctor-registration/doctor-registration';
import { PatientRegistration } from '../patient-registration/patient-registration';

export type AuthMode = 'login' | 'doctor' | 'patient';

@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink, TranslatePipe, DoctorRegistration, PatientRegistration],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  protected readonly uiLanguage = inject(LanguageService);
  readonly langService = this.uiLanguage;
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  private readonly api = inject(AuthApi);
  private readonly doctorApi = inject(DoctorApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly subscription = inject(SubscriptionState);

  readonly activeMode = signal<AuthMode>('login');
  readonly showSignupSheet = signal(false);
  readonly showSignupMenu = signal(false);
  readonly showDemoShortcuts = signal(
    typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.search.includes('demo=true')),
  );

  openSignupSheet(): void {
    this.showSignupSheet.set(true);
  }

  closeSignupSheet(): void {
    this.showSignupSheet.set(false);
  }

  toggleSignupMenu(): void {
    this.showSignupMenu.update((open) => !open);
  }

  closeSignupMenu(): void {
    this.showSignupMenu.set(false);
  }

  selectRegisterRole(mode: 'doctor' | 'patient'): void {
    this.closeSignupMenu();
    this.closeSignupSheet();
    this.setMode(mode);
  }

  selectModeFromSheet(mode: AuthMode): void {
    this.closeSignupSheet();
    this.closeSignupMenu();
    this.setMode(mode);
  }

  constructor() {
    const initialMode = this.route.snapshot.data?.['initialMode'] as AuthMode | undefined;
    if (initialMode) {
      this.activeMode.set(initialMode);
    } else if (this.router.url.includes('/register/doctor')) {
      this.activeMode.set('doctor');
    } else if (this.router.url.includes('/register/patient')) {
      this.activeMode.set('patient');
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        if (event.urlAfterRedirects.includes('/register/doctor')) {
          this.activeMode.set('doctor');
        } else if (event.urlAfterRedirects.includes('/register/patient')) {
          this.activeMode.set('patient');
        } else if (event.urlAfterRedirects.includes('/login')) {
          this.activeMode.set('login');
        }
      });

    afterNextRender(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
      this.runEntranceAnimation();
    });

    this.destroyRef.onDestroy(() => {
      const host = this.hostRef.nativeElement;
      gsap.killTweensOf(
        host.querySelectorAll(
          '.product-presentation-col, .login-card-surface, .login-form .form-field-group, .btn-login-submit, .create-account-wrap',
        ),
      );
    });
  }

  setMode(mode: AuthMode): void {
    if (this.activeMode() === mode) return;
    const targetUrl =
      mode === 'login' ? '/login' : mode === 'doctor' ? '/register/doctor' : '/register/patient';
    const returnUrl = resolveReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
    const identifier = this.route.snapshot.queryParamMap.get('identifier');
    void this.router.navigate([targetUrl], {
      queryParams: {
        ...(returnUrl ? { returnUrl } : {}),
        ...(identifier && identifier.length <= 200 && !/[\u0000-\u001f\u007f]/.test(identifier)
          ? { identifier }
          : {}),
      },
    });
  }

  private runEntranceAnimation(): void {
    if (
      typeof window === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const host = this.hostRef.nativeElement;
    const targets = host.querySelectorAll(
      '.product-presentation-col, .login-card-surface, .login-form .form-field-group, .btn-login-submit, .create-account-wrap',
    );
    if (!targets.length) return;
    gsap.fromTo(
      targets,
      { y: 16, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.48,
        stagger: 0.06,
        ease: 'power2.out',
        overwrite: 'auto',
        clearProps: 'transform,opacity',
      },
    );
  }

  protected readonly model = signal({
    identifier: this.route.snapshot.queryParamMap.get('identifier') || '',
    password: '',
  });
  protected readonly loginForm = form(this.model, (field) => {
    required(field.identifier, { message: 'ui.full.251' });
    maxLength(field.identifier, 200, { message: 'validation.length200' });
    required(field.password, { message: 'validation.passwordRequired' });
    maxLength(field.password, 4096, { message: 'validation.passwordLength' });
  });
  protected readonly isSubmitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly fieldErrors = signal<Readonly<Record<string, string[]>>>({});
  protected readonly successStatus = this.route.snapshot.queryParamMap.get('status');

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.loginForm, async () => {
      if (this.isSubmitting()) return;
      this.isSubmitting.set(true);
      this.fieldErrors.set({});
      try {
        const login = await firstValueFrom(this.api.login(this.model()));
        if (!this.session.begin(login)) {
          this.toast.error(this.uiLanguage.t('ui.full.252'));
          return;
        }
        const user = await firstValueFrom(this.api.currentUser());
        this.session.complete(user);
        if (user.userType === 'Doctor') {
          await this.subscription.refresh(true).catch(() => undefined);
        }
        let destination = this.session.requiresPasswordChange()
          ? '/change-password'
          : this.session.destinationFor(user);
        if (user.userType === 'Doctor' && !this.session.requiresPasswordChange()) {
          destination = '/doctor/onboarding';
          try {
            const status = await firstValueFrom(this.doctorApi.onboardingStatus());
            if (status.approvalStatus === 'Approved') {
              destination = this.subscription.needsReview()
                ? '/doctor/subscription'
                : '/workspace/doctor';
            }
          } catch {
            this.toast.error(this.uiLanguage.t('common.failedToLoad'));
          }
        }
        const returnUrl = resolveReturnUrl(
          this.route.snapshot.queryParamMap.get('returnUrl'),
          user.userType,
        );
        if (
          !this.session.requiresPasswordChange() &&
          !['/doctor/onboarding', '/doctor/subscription'].includes(destination) &&
          returnUrl
        ) {
          const restored = await this.router.navigateByUrl(returnUrl).catch(() => false);
          if (!restored) await this.router.navigate([destination]);
        } else {
          await this.router.navigate([destination]);
        }
      } catch (error) {
        this.session.clear();
        const parsed = parseApiErrors(error);
        this.fieldErrors.set(parsed.fields);
        this.toast.error(this.uiLanguage.t(parsed.messages[0] || 'common.requestFailed'));
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }

  protected serverError(field: string): string {
    return this.fieldErrors()[field.toLowerCase()]?.[0] ?? '';
  }

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected fillDemo(role: 'doctor' | 'patient' | 'reception'): void {
    if (role === 'doctor') {
      this.model.set({
        identifier: 'dr.mona@wasla-demo.invalid',
        password: 'Password123!',
      });
    } else if (role === 'reception') {
      this.model.set({
        identifier: 'reception.sara@wasla-demo.invalid',
        password: 'Password123!',
      });
    } else {
      this.model.set({
        identifier: 'patient.ahmed@wasla-demo.invalid',
        password: 'Password123!',
      });
    }
  }
}
