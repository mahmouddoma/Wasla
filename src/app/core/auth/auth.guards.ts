import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthSession } from './auth-session';
import { PERMISSIONS } from './permissions';

export const anonymousOnlyMatchGuard: CanMatchFn = () => {
  const session = inject(AuthSession);
  return !session.isAuthenticated();
};

export const authenticatedGuard: CanActivateFn = () => {
  const session = inject(AuthSession);
  const router = inject(Router);
  if (!session.isAuthenticated()) {
    session.clear();
    return router.createUrlTree(['/login']);
  }
  return session.requiresPasswordChange() ? router.createUrlTree(['/change-password']) : true;
};

export const catalogManagerAreaGuard: CanActivateFn = (route) => {
  const session = inject(AuthSession);
  const user = session.user();
  const area =
    user?.userType === 'DrugCatalogManager'
      ? 'drug-catalog-manager'
      : user?.userType === 'MedicalCatalogManager'
        ? 'medical-catalog-manager'
        : null;
  if (!area) return true;
  return route.data['catalogManagerArea'] === user?.userType ||
    (user?.userType === 'DrugCatalogManager' && route.data['catalogManagerArea'] === true) ||
    (route.routeConfig?.path === 'workspace/:area' && route.paramMap.get('area') === area)
    ? true
    : inject(Router).createUrlTree([session.destinationFor(user!)]);
};

export const accountAreaGuard: CanActivateFn = (route) => {
  const session = inject(AuthSession);
  const router = inject(Router);
  const user = session.user();
  if (!user) return router.createUrlTree(['/login']);
  const destination = session.destinationFor(user);
  return destination.startsWith('/workspace/') &&
    route.paramMap.get('area') === destination.split('/').at(-1)
    ? true
    : router.createUrlTree([destination]);
};

export const doctorOnboardingGuard: CanActivateFn = () => {
  const session = inject(AuthSession);
  const router = inject(Router);
  const user = session.user();
  if (!user) return router.createUrlTree(['/login']);
  if (user.userType !== 'Doctor' || !session.hasPermission(PERMISSIONS.doctorOnboardingViewOwn)) {
    return router.createUrlTree([session.destinationFor(user)]);
  }
  return true;
};

export const doctorProfileGuard: CanActivateFn = () => {
  const session = inject(AuthSession);
  const router = inject(Router);
  const user = session.user();
  if (!user) return router.createUrlTree(['/login']);
  const permissions = [
    PERMISSIONS.doctorSpecializationsViewOwn,
    PERMISSIONS.doctorPracticeLocationViewOwn,
    PERMISSIONS.doctorPracticeLocationManageOwn,
  ];
  return user.userType === 'Doctor' &&
    permissions.some((permission) => session.hasPermission(permission))
    ? true
    : router.createUrlTree([session.destinationFor(user)]);
};

export const permissionGuard: CanActivateFn = (route) => {
  const session = inject(AuthSession);
  const router = inject(Router);
  const user = session.user();
  if (!user) return router.createUrlTree(['/login']);
  const permission = route.data['permission'];
  if (typeof route.data['actor'] === 'string' && user.userType !== route.data['actor']) {
    return router.createUrlTree([session.destinationFor(user)]);
  }
  const allowed =
    typeof permission === 'string'
      ? session.hasPermission(permission)
      : Array.isArray(permission) &&
        permission.some((value) => typeof value === 'string' && session.hasPermission(value));
  return allowed ? true : router.createUrlTree([session.destinationFor(user)]);
};

export const anonymousGuard: CanActivateFn = () => {
  const session = inject(AuthSession);
  const router = inject(Router);
  const user = session.user();
  if (!session.isAuthenticated() || !user) return true;
  return router.createUrlTree([
    session.requiresPasswordChange() ? '/change-password' : session.destinationFor(user),
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
    : router.createUrlTree([session.destinationFor(session.user()!)]);
};
