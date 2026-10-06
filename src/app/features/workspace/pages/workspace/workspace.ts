import { ReceptionPracticeContext } from '../../../../domains/reception-practices';
import { RouterLink } from '@angular/router';
import { AuthSession } from '../../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../../core/auth/permissions';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';

@Component({
  selector: 'app-workspace',
  imports: [RouterLink, TranslatePipe, PageHeader],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Workspace {
  readonly langService = inject(LanguageService);
  private readonly reception = inject(ReceptionPracticeContext);
  private readonly session = inject(AuthSession);
  protected readonly user = this.session.user;

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
    if (
      type === 'Reception' &&
      this.reception.hasAnyPracticeWithAnyPermission([
        PERMISSIONS.practiceReservationsView,
        PERMISSIONS.practiceReservationsCreate,
      ])
    )
      return '/reception/reservations';
    if (type === 'Doctor' && this.session.hasPermission('DoctorPracticeReservations.ViewOwn'))
      return '/doctor/reservations';
    return '';
  });
  readonly ticketPath = computed(() => {
    const type = this.user()?.userType;
    if (type === 'Patient' && this.session.hasPermission(PERMISSIONS.ticketsViewOwn))
      return '/patient/tickets';
    if (
      type === 'Reception' &&
      this.reception.hasAnyPracticeWithPermission(PERMISSIONS.practiceTicketsView)
    )
      return '/reception/queue';
    if (type === 'Doctor') return '/doctor/queue';
    return '';
  });
  protected readonly hasAnyModules = computed(
    () =>
      !!this.reservationPath() ||
      !!this.ticketPath() ||
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
    switch (type) {
      case 'Doctor':
        return {
          label: this.langService.t('ui.full.765'),
          icon: 'stethoscope',
        };
      case 'Reception':
        return { label: this.langService.t('ui.full.766'), icon: 'desk' };
      case 'Patient':
        return {
          label: this.langService.t('ui.full.767'),
          icon: 'user',
        };
      case 'SuperAdmin':
        return { label: this.langService.t('ui.full.768'), icon: 'shield' };
      default:
        return { label: type ?? '', icon: 'user' };
    }
  });
}
