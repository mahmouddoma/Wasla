import { Routes } from '@angular/router';
import { authenticatedGuard, permissionGuard, doctorProfileGuard, doctorOnboardingGuard } from '../../core/auth/auth.guards';
import { PERMISSIONS } from '../../core/auth/permissions';

export const FEATURE_ROUTES: Routes = [
{
    path: 'patients',
    canActivate: [authenticatedGuard, permissionGuard],
    data: {
      permission: [PERMISSIONS.patientsSearchBasic, PERMISSIONS.patientsRegister],
    },
    loadComponent: () =>
      import('./reception-patients/reception-patients').then(
        (m) => m.ReceptionPatients,
      ),
    title: 'routes.patients',
  },
{
    path: 'family-requests',
    canActivate: [authenticatedGuard, permissionGuard],
    data: {
      permission: [
        PERMISSIONS.familyRelationshipRequestsCreateAssisted,
        PERMISSIONS.familyRelationshipRequestsViewAssisted,
        PERMISSIONS.familyRelationshipRequestsResubmitAssisted,
      ],
    },
    loadComponent: () =>
      import('./reception-family-requests/reception-family-requests').then(
        (m) => m.ReceptionFamilyRequests,
      ),
    title: 'routes.assistedFamily',
  },
  {
    path: 'worklist',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./reception-worklist/reception-worklist.component').then(
        (m) => m.ReceptionWorklistComponent,
      ),
    title: 'worklist.title',
  },
  {
    path: 'handovers',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./reception-handovers/reception-handovers.component').then(
        (m) => m.ReceptionHandoversComponent,
      ),
    title: 'handovers.title',
  },
];
