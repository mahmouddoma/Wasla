import { Routes } from '@angular/router';
import {
  accountAreaGuard,
  anonymousGuard,
  authenticatedGuard,
  passwordChangeGuard,
} from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/auth/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        canActivate: [anonymousGuard],
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'register/patient',
        canActivate: [anonymousGuard],
        loadComponent: () =>
          import('./features/auth/patient-registration/patient-registration').then(
            (m) => m.PatientRegistration,
          ),
      },
      {
        path: 'register/doctor',
        canActivate: [anonymousGuard],
        loadComponent: () =>
          import('./features/auth/doctor-registration/doctor-registration').then(
            (m) => m.DoctorRegistration,
          ),
      },
      {
        path: 'forgot-password',
        canActivate: [anonymousGuard],
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
      },
      {
        path: 'forgot-password/otp',
        canActivate: [anonymousGuard],
        loadComponent: () =>
          import('./features/auth/otp-handoff/otp-handoff').then((m) => m.OtpHandoff),
      },
      {
        path: 'change-password',
        canActivate: [passwordChangeGuard],
        loadComponent: () =>
          import('./features/auth/change-password/change-password').then((m) => m.ChangePassword),
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
  {
    path: 'workspace/:area',
    canActivate: [authenticatedGuard, accountAreaGuard],
    loadComponent: () => import('./features/workspace/workspace').then((m) => m.Workspace),
  },
  { path: '**', redirectTo: 'login' },
];
