import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';
export const reservationGuard: CanActivateFn = (route, state) => {
  const session = inject(AuthSession),
    router = inject(Router),
    user = session.user();
  if (!session.isAuthenticated() || !user)
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  if (session.requiresPasswordChange()) return router.createUrlTree(['/change-password']);
  const actor = route.data['actor'];
  const allowed =
    actor === 'Admin'
      ? session.hasPermission('Reservations.ViewAdministrative')
      : user.userType === actor &&
        (actor !== 'Doctor' || session.hasPermission('DoctorPracticeReservations.ViewOwn'));
  return allowed || router.createUrlTree([session.destinationFor(user)]);
};
export const RESERVATION_ROUTES: Routes = [
  {
    path: '',
    canActivate: [reservationGuard],
    loadComponent: () =>
      import('./pages/reservation-workspace/reservation-workspace.component').then(
        (m) => m.ReservationWorkspaceComponent,
      ),
    title: 'reservations.title',
  },
];
