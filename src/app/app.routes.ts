import { Routes } from '@angular/router';
import { accountAreaGuard, authenticatedGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  ...(['doctor', 'reception'] as const).map((area) => ({
    path: area + '/queue',
    data: { actor: area === 'doctor' ? 'Doctor' : 'Reception' },
    loadChildren: () =>
      import('./features/tickets/tickets.routes').then((module) => module.TICKET_ROUTES),
  })),
  {
    path: 'patient/tickets',
    data: { actor: 'Patient', permission: 'Tickets.ViewOwn' },
    loadChildren: () =>
      import('./features/tickets/tickets.routes').then((module) => module.PATIENT_TICKET_ROUTES),
  },
  ...(['patient', 'doctor', 'reception', 'admin'] as const).map((area) => ({
    path: area + '/reservations',
    data: { actor: area === 'admin' ? 'Admin' : area[0].toUpperCase() + area.slice(1) },
    loadChildren: () =>
      import('./features/reservations/reservations.routes').then((m) => m.RESERVATION_ROUTES),
  })),
  {
    path: 'doctors',
    loadComponent: () =>
      import('./features/public-doctors/pages/public-doctors/public-doctors').then(
        (m) => m.PublicDoctors,
      ),
    title: 'routes.findDoctor',
  },
  {
    path: 'doctors/:doctorId',
    loadComponent: () =>
      import('./features/public-doctor-details/pages/public-doctor-details/public-doctor-details').then(
        (m) => m.PublicDoctorDetailsPage,
      ),
    title: 'routes.doctorDetails',
  },
  {
    path: '',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'doctor/practices',
    loadChildren: () =>
      import('./features/doctor-practices/doctor-practices.routes').then((m) => m.FEATURE_ROUTES),
  },
  {
    path: 'doctor/profile',
    loadChildren: () =>
      import('./features/doctor-profile/doctor-profile.routes').then((m) => m.FEATURE_ROUTES),
  },
  {
    path: 'doctor/receptions',
    loadChildren: () =>
      import('./features/doctor-receptions/doctor-receptions.routes').then((m) => m.FEATURE_ROUTES),
  },
  {
    path: 'doctor/onboarding',
    loadChildren: () =>
      import('./features/doctor-onboarding/doctor-onboarding.routes').then((m) => m.FEATURE_ROUTES),
  },
  {
    path: 'admin',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout').then((m) => m.AdminLayout),
    loadChildren: () =>
      import('./features/admin/admin.routes').then((routes) => routes.ADMIN_ROUTES),
  },
  {
    path: 'reception',
    loadChildren: () =>
      import('./features/reception/reception.routes').then((m) => m.FEATURE_ROUTES),
  },
  {
    path: 'patient',
    loadChildren: () => import('./features/patient/patient.routes').then((m) => m.FEATURE_ROUTES),
  },
  {
    path: 'workspace/:area',
    title: 'routes.workspace',
    canActivate: [authenticatedGuard, accountAreaGuard],
    loadComponent: () =>
      import('./features/workspace/pages/workspace/workspace').then((m) => m.Workspace),
  },
  { path: '**', redirectTo: 'login' },
];
