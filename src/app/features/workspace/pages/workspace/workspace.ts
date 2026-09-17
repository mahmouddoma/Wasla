import { Router, RouterLink } from '@angular/router';
import { AuthSession } from '../../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../../core/auth/permissions';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../../../../shared/components/language-switcher/language-switcher';
import { PlatformFooter } from '../../../../shared/components/platform-footer/platform-footer';
import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';

@Component({
  selector: 'app-workspace',
  imports: [RouterLink, LanguageSwitcher, TranslatePipe, PlatformFooter],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Workspace {
  readonly langService = inject(LanguageService);
  protected readonly user = inject(AuthSession).user;
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  protected readonly canManageDoctorProfile =
    this.session.hasPermission(PERMISSIONS.doctorSpecializationsViewOwn) ||
    this.session.hasPermission(PERMISSIONS.doctorPracticeLocationManageOwn);
  protected readonly canViewDoctorPractices = this.session.hasPermission(
    PERMISSIONS.doctorPracticesViewOwn,
  );
  protected readonly canViewReceptionUsers = this.session.hasPermission(
    PERMISSIONS.receptionUsersViewOwn,
  );
  protected readonly canManagePatients =
    this.session.hasPermission(PERMISSIONS.patientsSearchBasic) ||
    this.session.hasPermission(PERMISSIONS.patientsRegister);
  protected readonly canManageAssistedFamilyRequests =
    this.session.hasPermission(PERMISSIONS.familyRelationshipRequestsCreateAssisted) ||
    this.session.hasPermission(PERMISSIONS.familyRelationshipRequestsViewAssisted) ||
    this.session.hasPermission(PERMISSIONS.familyRelationshipRequestsResubmitAssisted);
  protected readonly canManagePatientProfile =
    this.session.hasPermission(PERMISSIONS.patientProfileViewOwn) ||
    this.session.hasPermission(PERMISSIONS.patientProfileUpdateOwn) ||
    this.session.hasPermission(PERMISSIONS.patientContactsViewOwn) ||
    this.session.hasPermission(PERMISSIONS.patientContactsManageOwn);
  protected readonly canManageFamily =
    this.session.hasPermission(PERMISSIONS.familiesViewOwn) ||
    this.session.hasPermission(PERMISSIONS.familyRelationshipRequestsViewOwn) ||
    this.session.hasPermission(PERMISSIONS.familyRelationshipRequestsCreate) ||
    this.session.hasPermission(PERMISSIONS.familyRelationshipRequestsResubmitOwn);

  readonly reservationPath = computed(() => {
    const type = this.user()?.userType;
    if (type === 'SuperAdmin' && this.session.hasPermission('Reservations.ViewAdministrative'))
      return '/admin/reservations';
    if (type === 'Patient') return '/patient/reservations';
    if (type === 'Reception') return '/reception/reservations';
    if (type === 'Doctor' && this.session.hasPermission('DoctorPracticeReservations.ViewOwn'))
      return '/doctor/reservations';
    return '';
  });
  protected readonly hasAnyModules = computed(
    () =>
      !!this.reservationPath() ||
      this.canManageDoctorProfile ||
      this.canViewDoctorPractices ||
      this.canViewReceptionUsers ||
      this.canManagePatients ||
      this.canManageAssistedFamilyRequests ||
      this.canManagePatientProfile ||
      this.canManageFamily,
  );

  protected readonly illustrationPath = computed(() => {
    const type = this.user()?.userType;
    if (type === 'Doctor') return '/SVG-AVATAR/Online Doctor-rafiki.svg';
    if (type === 'Patient') return '/SVG-AVATAR/Medical prescription-rafiki.svg';
    return '/SVG-AVATAR/Doctors-bro.svg';
  });

  protected readonly roleBadge = computed(() => {
    const type = this.user()?.userType;
    const isAr = this.langService.currentLang() === 'ar';
    switch (type) {
      case 'Doctor':
        return {
          label: isAr ? this.langService.t('ui.full.765') : 'Practicing Doctor',
          icon: 'stethoscope',
        };
      case 'Reception':
        return { label: isAr ? this.langService.t('ui.full.766') : 'Receptionist', icon: 'desk' };
      case 'Patient':
        return {
          label: isAr ? this.langService.t('ui.full.767') : 'Verified Patient',
          icon: 'user',
        };
      case 'SuperAdmin':
        return { label: isAr ? this.langService.t('ui.full.768') : 'Super Admin', icon: 'shield' };
      default:
        return { label: type ?? '', icon: 'user' };
    }
  });

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }
}
