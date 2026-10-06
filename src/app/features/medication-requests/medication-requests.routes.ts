import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/auth.guards';
export const MEDICATION_REQUEST_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    title: 'requests.title',
    loadComponent: () =>
      import('./pages/medication-requests/medication-requests.component').then(
        (m) => m.MedicationRequestsComponent,
      ),
  },
];
