import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';
import { authenticatedGuard } from '../../core/auth/auth.guards';

export const encounterActorGuard: CanActivateFn = (route) => {
  const session = inject(AuthSession),
    router = inject(Router),
    user = session.user();
  const doctor = route.data['actor'] === 'Doctor';
  return user?.userType === route.data['actor'] &&
    session.hasPermission(
      doctor ? 'MedicalEncounters.ViewOwn' : 'MedicalEncounters.ViewOwnCompleted',
    )
    ? true
    : router.createUrlTree([user ? session.destinationFor(user) : '/login']);
};
export const ENCOUNTER_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authenticatedGuard, encounterActorGuard],
    loadComponent: () =>
      import('./pages/encounter-workspace/encounter-workspace.component').then(
        (m) => m.EncounterWorkspaceComponent,
      ),
    title: 'encounters.title',
  },
];
