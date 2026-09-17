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
];
