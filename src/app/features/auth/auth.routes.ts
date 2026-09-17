import { Routes } from '@angular/router';
import { anonymousGuard, passwordChangeGuard } from '../../core/auth/auth.guards';
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        title: 'routes.login',
        canActivate: [anonymousGuard],
        loadComponent: () => import('./login/login').then((m) => m.Login),
      },
      {
        path: 'register/patient',
        title: 'routes.registerPatient',
        canActivate: [anonymousGuard],
        loadComponent: () =>
          import('./patient-registration/patient-registration').then((m) => m.PatientRegistration),
      },
      {
        path: 'register/doctor',
        title: 'routes.registerDoctor',
        canActivate: [anonymousGuard],
        loadComponent: () =>
          import('./doctor-registration/doctor-registration').then((m) => m.DoctorRegistration),
      },
      {
        path: 'forgot-password/otp',
        canActivate: [anonymousGuard],
        loadComponent: () => import('./otp-handoff/otp-handoff').then((m) => m.OtpHandoff),
        title: 'routes.otp',
      },
      {
        path: 'forgot-password/reset',
        canActivate: [anonymousGuard],
        loadComponent: () => import('./reset-password/reset-password').then((m) => m.ResetPassword),
        title: 'routes.resetPassword',
      },
      {
        path: 'forgot-password',
        canActivate: [anonymousGuard],
        loadComponent: () =>
          import('./forgot-password/forgot-password').then((m) => m.ForgotPassword),
        title: 'routes.forgotPassword',
      },
      {
        path: 'change-password',
        title: 'routes.changePassword',
        canActivate: [passwordChangeGuard],
        loadComponent: () =>
          import('./change-password/change-password').then((m) => m.ChangePassword),
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
];
