import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';

/** Local session checks only; practice delegation is reconciled after activation. */
export const receptionPracticeGuard: CanActivateFn = () => {
  const session = inject(AuthSession);
  const router = inject(Router);
  const user = session.user();
  if (user?.userType !== 'Reception') return true;
  if (!session.isAuthenticated()) return router.createUrlTree(['/login']);
  if (session.requiresPasswordChange()) return router.createUrlTree(['/change-password']);
  return true;
};
