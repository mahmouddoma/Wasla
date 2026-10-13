import { Routes } from '@angular/router';
import {
  authenticatedGuard,
  permissionGuard,
  doctorProfileGuard,
  doctorOnboardingGuard,
} from '../../core/auth/auth.guards';
import { PERMISSIONS } from '../../core/auth/permissions';

export const FEATURE_ROUTES: Routes = [
  {
    path: 'profile',
    canActivate: [authenticatedGuard, permissionGuard],
    data: {
      permission: [
        PERMISSIONS.patientProfileViewOwn,
        PERMISSIONS.patientProfileUpdateOwn,
        PERMISSIONS.patientContactsViewOwn,
        PERMISSIONS.patientContactsManageOwn,
      ],
    },
    loadComponent: () => import('./patient-profile/patient-profile').then((m) => m.PatientProfile),
    title: 'routes.patientProfile',
  },
  {
    path: 'family',
    canActivate: [authenticatedGuard, permissionGuard],
    data: {
      permission: [
        PERMISSIONS.familiesViewOwn,
        PERMISSIONS.familyRelationshipRequestsCreate,
        PERMISSIONS.familyRelationshipRequestsViewOwn,
        PERMISSIONS.familyRelationshipRequestsResubmitOwn,
      ],
    },
    loadComponent: () => import('./patient-family/patient-family').then((m) => m.PatientFamily),
    title: 'routes.patientFamily',
  },
  {
    path: 'medical-access',
    canActivate: [authenticatedGuard, permissionGuard],
    data: {
      permission: [PERMISSIONS.familiesViewOwn],
    },
    loadComponent: () =>
      import('./patient-medical-access/patient-medical-access.component').then(
        (m) => m.PatientMedicalAccessComponent,
      ),
    title: 'routes.patientMedicalAccess',
  },
  {
    path: 'dependent-records',
    canActivate: [authenticatedGuard, permissionGuard],
    data: {
      permission: [PERMISSIONS.familiesViewOwn],
    },
    loadComponent: () =>
      import('./dependent-medical-record/dependent-medical-record.component').then(
        (m) => m.DependentMedicalRecordComponent,
      ),
    title: 'routes.patientDependentRecords',
  },
];


