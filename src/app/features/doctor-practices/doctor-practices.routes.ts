import { Routes } from '@angular/router';
import { authenticatedGuard, permissionGuard, doctorProfileGuard, doctorOnboardingGuard } from '../../core/auth/auth.guards';
import { PERMISSIONS } from '../../core/auth/permissions';

export const FEATURE_ROUTES: Routes = [
{
    path: '',
    canActivate: [authenticatedGuard, permissionGuard],
    data: { permission: PERMISSIONS.doctorPracticesViewOwn },
    loadComponent: () =>
      import('./pages/doctor-practices/doctor-practices').then((m) => m.DoctorPractices),
    title: 'routes.practices',
  },
{
    path: 'new',
    canActivate: [authenticatedGuard, permissionGuard],
    data: { permission: PERMISSIONS.doctorPracticesManageOwn },
    loadComponent: () =>
      import('./pages/doctor-practices/doctor-practices').then((m) => m.DoctorPractices),
    title: 'routes.createPractice',
  },
{
    path: ':practiceId',
    canActivate: [authenticatedGuard, permissionGuard],
    data: { permission: PERMISSIONS.doctorPracticesViewOwn },
    loadComponent: () =>
      import('./pages/doctor-practices/doctor-practices').then((m) => m.DoctorPractices),
    title: 'routes.practiceDetails',
  }
];
