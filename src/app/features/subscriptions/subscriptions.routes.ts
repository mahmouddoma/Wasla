import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/auth.guards';

export const DOCTOR_SUBSCRIPTION_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { actor: 'Doctor', permission: 'Subscriptions.ViewOwn' },
    loadComponent: () =>
      import('./pages/my-subscription/my-subscription.component').then(
        (module) => module.MySubscriptionComponent,
      ),
    title: 'subscriptions.mine',
  },
];
export const ADMIN_SUBSCRIPTION_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    data: { actor: 'SuperAdmin', permission: 'Subscriptions.ViewAll' },
    loadComponent: () =>
      import('./pages/admin-subscriptions/admin-subscriptions.component').then(
        (module) => module.AdminSubscriptionsComponent,
      ),
    title: 'subscriptions.admin',
  },
];
