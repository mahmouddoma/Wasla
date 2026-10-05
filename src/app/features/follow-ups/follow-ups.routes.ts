import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';
import { authenticatedGuard } from '../../core/auth/auth.guards';

const followUpGuard: CanActivateFn = () => {
  const session = inject(AuthSession),
    router = inject(Router),
    user = session.user();
  return user?.userType === 'Patient' && session.hasPermission('FollowUpEligibility.ViewOwn')
    ? true
    : router.createUrlTree([user ? session.destinationFor(user) : '/login']);
};
export const FOLLOW_UP_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authenticatedGuard, followUpGuard],
    loadComponent: () =>
      import('./pages/follow-up-list/follow-up-list.component').then(
        (m) => m.FollowUpListComponent,
      ),
    title: 'followUps.title',
  },
];
