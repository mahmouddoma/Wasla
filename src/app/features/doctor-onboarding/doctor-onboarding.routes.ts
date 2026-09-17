import { Routes } from '@angular/router';
import { authenticatedGuard, permissionGuard, doctorProfileGuard, doctorOnboardingGuard } from '../../core/auth/auth.guards';
import { PERMISSIONS } from '../../core/auth/permissions';

export const FEATURE_ROUTES: Routes = [
{
    path: '',
    canActivate: [authenticatedGuard, doctorOnboardingGuard],
    loadComponent: () =>
      import('./pages/doctor-onboarding/doctor-onboarding').then((m) => m.DoctorOnboarding),
    title: 'routes.onboarding',
  }
];
