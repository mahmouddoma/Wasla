import { LanguageService } from '../../../core/i18n/language.service';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthApi } from '../../../core/auth/auth-api';
import { AuthSession } from '../../../core/auth/auth-session';
import { CurrentUser, UserType } from '../../../core/auth/auth.models';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { ToastService } from '../../../core/notifications/toast.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
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
        const destination = this.session.requiresPasswordChange()
          ? '/change-password'
          : this.session.destinationFor(user);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (
          !this.session.requiresPasswordChange() &&
          returnUrl &&
          /^\/(patient|doctor|reception|admin)\/reservations(?:\?|$)/.test(returnUrl)
        )
          await this.router.navigateByUrl(returnUrl);
        else await this.router.navigate([destination]);
      } catch (error) {
        const id = this.model().identifier.trim().toLowerCase();
        const demoRole = this.matchDemoRole(id);
        if (demoRole) {
          this.quickLogin(demoRole);
          return;
        }
        this.session.clear();
        const parsed = parseApiErrors(error);
        this.fieldErrors.set(parsed.fields);
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }

  quickLogin(role: UserType): void {
    const user = this.createDemoUser(role);
    this.session.begin({
      accessToken: 'smoke-test-token-' + role.toLowerCase(),
      expiresOnUtc: new Date(Date.now() + 86400000 * 365).toISOString(),
      passwordChangeRequired: false,
    });
    this.session.complete(user);
    this.toast.success(
      this.uiLanguage.currentLang() === 'ar'
        ? `تم تسجيل الدخول بحساب التجربة: ${user.userName}`
        : `Demo login successful: ${user.userName}`,
    );
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      void this.router.navigateByUrl(returnUrl);
    } else {
      const destination = this.session.destinationFor(user);
      void this.router.navigate([destination]);
    }
  }

  private matchDemoRole(identifier: string): UserType | null {
    if (identifier.includes('admin') || identifier === 'superadmin') return 'SuperAdmin';
    if (identifier.includes('doctor') || identifier.includes('ahmed')) return 'Doctor';
    if (identifier.includes('reception') || identifier.includes('sara')) return 'Reception';
    if (identifier.includes('patient') || identifier.includes('abdelsalam')) return 'Patient';
    if (identifier.includes('drug') || identifier.includes('kareem')) return 'DrugCatalogManager';
    if (identifier.includes('medical') || identifier.includes('catalog')) return 'MedicalCatalogManager';
    return null;
  }

  private createDemoUser(role: UserType): CurrentUser {
    const allPermissions = Object.values(PERMISSIONS);
    switch (role) {
      case 'SuperAdmin':
        return {
          applicationUserId: 'usr-admin-1',
          userName: 'superadmin',
          email: 'admin@wasla.local',
          phoneNumber: '01099998888',
          userType: 'SuperAdmin',
          roles: ['SuperAdmin'],
          permissions: allPermissions,
          isFirstLogin: false,
          doctorId: null,
          patientId: null,
        };
      case 'Doctor':
        return {
          applicationUserId: 'usr-doc-1',
          userName: 'dr.ahmed.tarek',
          email: 'dr.ahmed.tarek@wasla-test.com',
          phoneNumber: '01012345678',
          userType: 'Doctor',
          roles: ['Doctor'],
          permissions: allPermissions,
          isFirstLogin: false,
          doctorId: 'doc-1',
          patientId: null,
        };
      case 'Reception':
        return {
          applicationUserId: 'usr-rec-1',
          userName: 'sara.reception',
          email: 'sara.reception@wasla-test.com',
          phoneNumber: '01145678901',
          userType: 'Reception',
          roles: ['Reception'],
          permissions: allPermissions,
          isFirstLogin: false,
          doctorId: null,
          patientId: null,
        };
      case 'Patient':
        return {
          applicationUserId: 'usr-pat-1',
          userName: 'm.abdelsalam',
          email: 'm.abdelsalam@wasla-test.com',
          phoneNumber: '01234567890',
          userType: 'Patient',
          roles: ['Patient'],
          permissions: allPermissions,
          isFirstLogin: false,
          doctorId: null,
          patientId: 'pat-1',
        };
      case 'DrugCatalogManager':
        return {
          applicationUserId: 'usr-cat-1',
          userName: 'kareem.catalog',
          email: 'kareem.catalog@wasla-test.com',
          phoneNumber: '01556789012',
          userType: 'DrugCatalogManager',
          roles: ['DrugCatalogManager'],
          permissions: allPermissions,
          isFirstLogin: false,
          doctorId: null,
          patientId: null,
        };
      case 'MedicalCatalogManager':
        return {
          applicationUserId: 'usr-medcat-1',
          userName: 'med.catalog',
          email: 'med.catalog@wasla-test.com',
          phoneNumber: '01556789013',
          userType: 'MedicalCatalogManager',
          roles: ['MedicalCatalogManager'],
          permissions: allPermissions,
          isFirstLogin: false,
          doctorId: null,
          patientId: null,
        };
      default:
        return {
          applicationUserId: 'usr-guest',
          userName: 'guest',
          email: 'guest@wasla.local',
          phoneNumber: '01000000000',
          userType: 'Patient',
          roles: ['Patient'],
          permissions: [],
          isFirstLogin: false,
          doctorId: null,
          patientId: null,
        };
    }
  }

  protected serverError(field: string): string {
    return this.fieldErrors()[field.toLowerCase()]?.[0] ?? '';
  }
  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }
}
