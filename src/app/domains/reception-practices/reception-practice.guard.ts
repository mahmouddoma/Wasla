import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';
import { ReceptionPracticeContext } from './reception-practice-context';

/** Delegation comes from active assignments, never from global role permissions. */
export const receptionPracticeGuard: CanActivateFn = async (route) => {
  const session = inject(AuthSession);
  const router = inject(Router);
  const user = session.user();
  if (user?.userType !== 'Reception') return true;
  const context = inject(ReceptionPracticeContext);
  const required: unknown = route.data['practicePermission'];
  const permissions =
    typeof required === 'string'
      ? [required]
      : Array.isArray(required)
        ? required.filter((value): value is string => typeof value === 'string')
        : [];
  await context.ensureLoaded();
  if (!session.isAuthenticated() || session.user()?.applicationUserId !== user.applicationUserId)
    return router.createUrlTree(['/login']);
  if (session.requiresPasswordChange()) return router.createUrlTree(['/change-password']);
  return context.hasAnyPracticeWithAnyPermission(permissions)
    ? true
    : router.createUrlTree([session.destinationFor(user)]);
};
