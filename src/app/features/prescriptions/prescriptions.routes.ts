import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/auth.guards';
export const PRESCRIPTION_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard],
    title: 'medications.prescription',
    loadComponent: () =>
      import('./pages/prescriptions/prescriptions.component').then((m) => m.PrescriptionsComponent),
  },
];
