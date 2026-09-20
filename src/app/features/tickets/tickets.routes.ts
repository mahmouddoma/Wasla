import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';
import { authenticatedGuard } from '../../core/auth/auth.guards';

const ticketActorGuard: CanActivateFn = (route) => {
  const session = inject(AuthSession);
  const router = inject(Router);
  const user = session.user();
  const actor = route.data['actor'];
  const permission = route.data['permission'];
  return user?.userType === actor &&
    (typeof permission !== 'string' || session.hasPermission(permission))
    ? true
    : router.createUrlTree([user ? session.destinationFor(user) : '/login']);
};

export const TICKET_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authenticatedGuard, ticketActorGuard],
    loadComponent: () =>
      import('./pages/queue-workspace/queue-workspace').then((module) => module.QueueWorkspace),
    title: 'tickets.queue.title',
  },
];

export const PATIENT_TICKET_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authenticatedGuard, ticketActorGuard],
    loadComponent: () =>
      import('./pages/patient-tickets/patient-tickets').then((module) => module.PatientTickets),
    title: 'tickets.mine.title',
  },
];
