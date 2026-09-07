import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from './auth-session';

export const authenticatedGuard: CanActivateFn = () => {
  const session = inject(AuthSession);
  const router = inject(Router);
  if (!session.isAuthenticated()) {
    session.clear();
    return router.createUrlTree(['/login']);
  }
  return session.requiresPasswordChange() ? router.createUrlTree(['/change-password']) : true;
};

export const accountAreaGuard: CanActivateFn = (route) => {
  const session = inject(AuthSession);
  const router = inject(Router);
  const user = session.user();
  if (!user) return router.createUrlTree(['/login']);
  const destination = session.destinationFor(user.userType);
  return route.paramMap.get('area') === destination.split('/').at(-1)
    ? true
    : router.createUrlTree([destination]);
};

export const anonymousGuard: CanActivateFn = () => {
  const session = inject(AuthSession);
  const router = inject(Router);
  const user = session.user();
  if (!session.isAuthenticated() || !user) return true;
  return router.createUrlTree([
    session.requiresPasswordChange() ? '/change-password' : session.destinationFor(user.userType),
  ]);
};

export const passwordChangeGuard: CanActivateFn = () => {
  const session = inject(AuthSession);
  const router = inject(Router);
  if (!session.isAuthenticated()) {
    session.clear();
    return router.createUrlTree(['/login']);
  }
  return session.requiresPasswordChange()
    ? true
    : router.createUrlTree([session.destinationFor(session.user()!.userType)]);
};
