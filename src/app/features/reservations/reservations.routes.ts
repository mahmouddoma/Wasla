import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';
import { receptionPracticeGuard } from '../../domains/reception-practices';
export const reservationGuard: CanActivateFn = (route, state) => {
  const session = inject(AuthSession),
    router = inject(Router),
    user = session.user();
  if (!session.isAuthenticated() || !user)
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  if (session.requiresPasswordChange()) return router.createUrlTree(['/change-password']);
  const actor = route.data['reservationActor'] ?? route.data['actor'];
  const allowed =
    actor === 'Admin'
      ? user.userType === 'SuperAdmin' && session.hasPermission('Reservations.ViewAdministrative')
      : user.userType === actor &&
        (actor !== 'Doctor' || session.hasPermission('DoctorPracticeReservations.ViewOwn'));
  return allowed || router.createUrlTree([session.destinationFor(user)]);
};
export const RESERVATION_ROUTES: Routes = [
  {
    path: '',
    canActivate: [reservationGuard, receptionPracticeGuard],
    loadComponent: () =>
      import('./pages/reservation-workspace/reservation-workspace.component').then(
        (m) => m.ReservationWorkspaceComponent,
      ),
    title: 'reservations.title',
  },
];
