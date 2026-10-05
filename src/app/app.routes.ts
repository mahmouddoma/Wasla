import { Routes } from '@angular/router';
import {
  accountAreaGuard,
  anonymousOnlyMatchGuard,
  authenticatedGuard,
} from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  // Public & Doctor Discovery (Anonymous)
  {
    path: 'doctors',
    canMatch: [anonymousOnlyMatchGuard],
    loadComponent: () =>
      import('./features/public-doctors/pages/public-doctors/public-doctors').then(
        (m) => m.PublicDoctors,
      ),
    title: 'routes.findDoctor',
  },
  {
    path: 'doctors/:doctorId',
    canMatch: [anonymousOnlyMatchGuard],
    loadComponent: () =>
      import('./features/public-doctor-details/pages/public-doctor-details/public-doctor-details').then(
        (m) => m.PublicDoctorDetailsPage,
      ),
    title: 'routes.doctorDetails',
  },

  // Public Legal & Support Pages
  {
    path: '',
    loadChildren: () => import('./features/legal/legal.routes').then((m) => m.LEGAL_ROUTES),
  },

  // SuperAdmin Portal (wrapped with AdminLayout)
  {
    path: 'admin',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout').then((m) => m.AdminLayout),
    loadChildren: () =>
      import('./features/admin/admin.routes').then((routes) => routes.ADMIN_ROUTES),
  },

  // Healthcare Staff & Patients Portal (wrapped with PortalLayout)
  {
    path: '',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./shared/components/portal-layout/portal-layout').then((m) => m.PortalLayout),
    children: [
      {
        path: 'doctor/encounters',
        data: { actor: 'Doctor' },
        loadChildren: () =>
          import('./features/encounters/encounters.routes').then((m) => m.ENCOUNTER_ROUTES),
      },
      {
        path: 'patient/encounters',
        data: { actor: 'Patient' },
        loadChildren: () =>
          import('./features/encounters/encounters.routes').then((m) => m.ENCOUNTER_ROUTES),
      },
      {
        path: 'patient/follow-ups',
        loadChildren: () =>
          import('./features/follow-ups/follow-ups.routes').then((m) => m.FOLLOW_UP_ROUTES),
      },
      {
        path: 'workspace/:area',
        title: 'routes.workspace',
        canActivate: [accountAreaGuard],
        loadComponent: () =>
          import('./features/workspace/pages/workspace/workspace').then((m) => m.Workspace),
      },
      {
        path: 'doctor/queue',
        data: { actor: 'Doctor' },
        loadChildren: () =>
          import('./features/tickets/tickets.routes').then((module) => module.TICKET_ROUTES),
      },
      {
        path: 'reception/queue',
        data: { actor: 'Reception' },
        loadChildren: () =>
          import('./features/tickets/tickets.routes').then((module) => module.TICKET_ROUTES),
      },
      {
        path: 'patient/tickets',
        data: { actor: 'Patient', permission: 'Tickets.ViewOwn' },
        loadChildren: () =>
          import('./features/tickets/tickets.routes').then(
            (module) => module.PATIENT_TICKET_ROUTES,
          ),
      },
      {
        path: 'doctor/finance',
        data: { actor: 'Doctor', view: 'transactions' },
        loadChildren: () =>
          import('./features/finance/finance.routes').then((m) => m.FINANCE_ROUTES),
      },
      {
        path: 'doctor/revenue',
        data: { actor: 'Doctor', view: 'revenue' },
        loadChildren: () =>
          import('./features/finance/finance.routes').then((m) => m.FINANCE_ROUTES),
      },
      {
        path: 'reception/finance',
        data: { actor: 'Reception', view: 'transactions' },
        loadChildren: () =>
          import('./features/finance/finance.routes').then((m) => m.FINANCE_ROUTES),
      },
      {
        path: 'patient/finance',
        data: { actor: 'Patient', view: 'transactions' },
        loadChildren: () =>
          import('./features/finance/finance.routes').then((m) => m.FINANCE_ROUTES),
      },
      {
        path: 'doctor/reservations',
        data: { actor: 'Doctor' },
        loadChildren: () =>
          import('./features/reservations/reservations.routes').then((m) => m.RESERVATION_ROUTES),
      },
      {
        path: 'patient/reservations',
        data: { actor: 'Patient' },
        loadChildren: () =>
          import('./features/reservations/reservations.routes').then((m) => m.RESERVATION_ROUTES),
      },
      {
        path: 'reception/reservations',
        data: { actor: 'Reception' },
        loadChildren: () =>
          import('./features/reservations/reservations.routes').then((m) => m.RESERVATION_ROUTES),
      },
      {
        path: 'doctor/practices',
        loadChildren: () =>
          import('./features/doctor-practices/doctor-practices.routes').then(
            (m) => m.FEATURE_ROUTES,
          ),
      },
      {
        path: 'doctor/profile',
        loadChildren: () =>
          import('./features/doctor-profile/doctor-profile.routes').then((m) => m.FEATURE_ROUTES),
      },
      {
        path: 'doctor/receptions',
        loadChildren: () =>
          import('./features/doctor-receptions/doctor-receptions.routes').then(
            (m) => m.FEATURE_ROUTES,
          ),
      },
      {
        path: 'doctor/onboarding',
        loadChildren: () =>
          import('./features/doctor-onboarding/doctor-onboarding.routes').then(
            (m) => m.FEATURE_ROUTES,
          ),
      },
      {
        path: 'reception',
        loadChildren: () =>
          import('./features/reception/reception.routes').then((m) => m.FEATURE_ROUTES),
      },
      {
        path: 'patient',
        loadChildren: () =>
          import('./features/patient/patient.routes').then((m) => m.FEATURE_ROUTES),
      },
      {
        path: 'doctors',
        title: 'routes.findDoctor',
        loadComponent: () =>
          import('./features/public-doctors/pages/public-doctors/public-doctors').then(
            (m) => m.PublicDoctors,
          ),
      },
      {
        path: 'doctors/:doctorId',
        title: 'routes.doctorDetails',
        loadComponent: () =>
          import('./features/public-doctor-details/pages/public-doctor-details/public-doctor-details').then(
            (m) => m.PublicDoctorDetailsPage,
          ),
      },
      {
        path: 'patient/find-doctor',
        redirectTo: 'doctors',
        pathMatch: 'full',
      },
    ],
  },

  // Auth & Anonymous Flow
  {
    path: '',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  { path: '**', redirectTo: 'login' },
];
