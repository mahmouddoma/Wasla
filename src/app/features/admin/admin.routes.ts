import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { AuthSession } from '../../core/auth/auth-session';
import { permissionGuard } from '../../core/auth/auth.guards';
import { PERMISSIONS } from '../../core/auth/permissions';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'medical-catalog-managers',
    canActivate: [permissionGuard],
    data: {
      actor: 'SuperAdmin',
      permission: 'MedicalCatalogManagers.ViewAll',
      managerKind: 'medical',
    },
    loadComponent: () =>
      import('./pages/drug-catalog-managers/drug-catalog-managers.component').then(
        (m) => m.DrugCatalogManagersComponent,
      ),
    title: 'diagnostics.managers',
  },
  {
    path: 'drug-catalog-managers',
    canActivate: [permissionGuard],
    data: { permission: 'DrugCatalogManagers.ViewAll' },
    loadComponent: () =>
      import('./pages/drug-catalog-managers/drug-catalog-managers.component').then(
        (m) => m.DrugCatalogManagersComponent,
      ),
    title: 'medications.managers',
  },
  {
    path: 'revenue',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.platformRevenueViewAggregates },
    loadComponent: () =>
      import('./revenue-dashboard/revenue-dashboard').then((m) => m.RevenueDashboard),
    title: 'finance.revenue.title',
  },
  {
    path: 'investigations',
    canActivate: [permissionGuard],
    data: {
      actor: 'SuperAdmin',
      permission: 'Investigations.View',
    },
    loadComponent: () =>
      import('./investigation-cases/investigation-cases.component').then(
        (m) => m.InvestigationCasesComponent,
      ),
    title: 'investigations.title',
  },
  {
    path: 'reservations',
    canActivate: [permissionGuard],
    data: {
      actor: 'SuperAdmin',
      reservationActor: 'Admin',
      permission: 'Reservations.ViewAdministrative',
    },
    loadChildren: () => import('../reservations').then((m) => m.RESERVATION_ROUTES),
    title: 'reservations.title',
  },
  {
    path: 'archive-operations',
    canActivate: [permissionGuard],
    data: {
      actor: 'SuperAdmin',
      permission: [PERMISSIONS.superAdminsViewAll, PERMISSIONS.archiveOperationsView],
    },
    loadComponent: () =>
      import('./archive-operations/archive-operations.component').then(
        (m) => m.ArchiveOperationsComponent,
      ),
    title: 'archive.operations.title',
  },
  {
    path: 'archives',
    canActivate: [permissionGuard],
    data: {
      actor: 'SuperAdmin',
      permission: [PERMISSIONS.superAdminsViewAll, PERMISSIONS.archivePlatformView],
    },
    loadComponent: () =>
      import('./archive-operations/archive-operations.component').then(
        (m) => m.ArchiveOperationsComponent,
      ),
    title: 'archive.title',
  },
  {
    path: 'patient-claims',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.patientClaimsViewAll },
    loadComponent: () =>
      import('./patient-claims/patient-claims.component').then((m) => m.PatientClaimsComponent),
    title: 'adminClaims.title',
  },
  {
    path: 'family-relationship-requests/:requestId',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.familyRelationshipRequestsViewDetails },
    loadComponent: () =>
      import('./family-request-details/family-request-details').then(
        (m) => m.FamilyRequestDetailsPage,
      ),
    title: 'routes.familyReview',
  },
  {
    path: 'family-relationship-requests',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.familyRelationshipRequestsViewAll },
    loadComponent: () =>
      import('./family-requests-list/family-requests-list').then((m) => m.FamilyRequestsList),
    title: 'routes.familyRequests',
  },
  {
    path: 'family-medical-access-requests',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.familyMedicalAccessRequestsViewAll },
    loadComponent: () =>
      import('./family-medical-access-requests/family-medical-access-requests.component').then(
        (m) => m.FamilyMedicalAccessRequestsComponent,
      ),
    title: 'routes.familyMedicalAccess',
  },
  {
    path: 'family-medical-eligibilities',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.familyMedicalAccessEligibilityReview },
    loadComponent: () =>
      import('./family-medical-eligibility-reviews/family-medical-eligibility-reviews.component').then(
        (m) => m.FamilyMedicalEligibilityReviewsComponent,
      ),
    title: 'routes.medicalEligibilities',
  },
  {
    path: 'doctor-specialization-requests/:requestId',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.doctorSpecializationRequestsViewDetails },
    loadComponent: () =>
      import('./specialization-request-details/specialization-request-details').then(
        (m) => m.SpecializationRequestDetailsPage,
      ),
    title: 'routes.specializationReview',
  },
  {
    path: 'doctor-specialization-requests',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.doctorSpecializationRequestsViewAll },
    loadComponent: () =>
      import('./specialization-requests-list/specialization-requests-list').then(
        (m) => m.SpecializationRequestsList,
      ),
    title: 'routes.specializationRequests',
  },
  {
    path: 'medical-specializations/create',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.specializationsCreate },
    loadComponent: () =>
      import('./medical-specialization-details/medical-specialization-details').then(
        (m) => m.MedicalSpecializationDetails,
      ),
    title: 'routes.specializationCreate',
  },
  {
    path: 'medical-specializations/:id',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.specializationsView },
    loadComponent: () =>
      import('./medical-specialization-details/medical-specialization-details').then(
        (m) => m.MedicalSpecializationDetails,
      ),
    title: 'routes.specializationDetails',
  },
  {
    path: 'medical-specializations',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.specializationsView },
    loadComponent: () =>
      import('./medical-specializations-list/medical-specializations-list').then(
        (m) => m.MedicalSpecializationsList,
      ),
    title: 'routes.specializations',
  },
  {
    path: 'roles/:roleId',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.rolesView },
    loadComponent: () => import('./role-details/role-details').then((m) => m.RoleDetails),
    title: 'routes.rolePermissions',
  },
  {
    path: 'roles',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.rolesView },
    loadComponent: () => import('./roles-list/roles-list').then((m) => m.RolesList),
    title: 'routes.roles',
  },
  {
    path: 'superadmins/create',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.superAdminsCreate },
    loadComponent: () =>
      import('./superadmin-create/superadmin-create').then((m) => m.SuperAdminCreate),
    title: 'routes.createAdmin',
  },
  {
    path: 'superadmins/:superAdminId',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.superAdminsViewDetails },
    loadComponent: () =>
      import('./superadmin-details/superadmin-details').then((m) => m.SuperAdminDetails),
    title: 'routes.adminDetails',
  },
  {
    path: 'superadmins',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.superAdminsViewAll },
    loadComponent: () =>
      import('./superadmins-list/superadmins-list').then((m) => m.SuperAdminsList),
    title: 'routes.admins',
  },
  {
    path: 'doctors/:doctorId',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.doctorsViewDetails },
    loadComponent: () => import('./doctor-details/doctor-details').then((m) => m.DoctorDetails),
    title: 'routes.doctorDetails',
  },
  {
    path: 'doctors',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.doctorsViewAll },
    loadComponent: () => import('./doctors-list/doctors-list').then((m) => m.DoctorsList),
    title: 'routes.doctors',
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => {
      const session = inject(AuthSession);
      const user = session.user();
      return user ? session.destinationFor(user) : '/login';
    },
  },
];
