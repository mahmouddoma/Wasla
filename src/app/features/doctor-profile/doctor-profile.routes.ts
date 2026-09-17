import { Routes } from '@angular/router';
import { authenticatedGuard, permissionGuard, doctorProfileGuard, doctorOnboardingGuard } from '../../core/auth/auth.guards';
import { PERMISSIONS } from '../../core/auth/permissions';

export const FEATURE_ROUTES: Routes = [
{
    path: '',
    canActivate: [authenticatedGuard, doctorProfileGuard],
    loadComponent: () =>
      import('./pages/doctor-profile/doctor-profile').then((m) => m.DoctorProfile),
    title: 'routes.practiceProfile',
  }
];
