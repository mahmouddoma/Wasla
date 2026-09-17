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
    path: '',
    canActivate: [authenticatedGuard, permissionGuard],
    data: { permission: PERMISSIONS.receptionUsersViewOwn },
    loadComponent: () =>
      import('./pages/doctor-receptions/doctor-receptions').then((m) => m.DoctorReceptions),
    title: 'routes.receptionTeam',
  },
  {
    path: 'new',
    canActivate: [authenticatedGuard, permissionGuard],
    data: { permission: PERMISSIONS.receptionUsersManageOwn },
    loadComponent: () =>
      import('./pages/doctor-receptions/doctor-receptions').then((m) => m.DoctorReceptions),
    title: 'routes.createReception',
  },
  {
    path: ':receptionId',
    canActivate: [authenticatedGuard, permissionGuard],
    data: { permission: PERMISSIONS.receptionUsersViewOwn },
    loadComponent: () =>
      import('./pages/doctor-receptions/doctor-receptions').then((m) => m.DoctorReceptions),
    title: 'routes.receptionDetails',
  },
];
