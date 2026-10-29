import { Routes } from '@angular/router';
import { authenticatedGuard, permissionGuard } from '../../core/auth/auth.guards';
import { PERMISSIONS } from '../../core/auth/permissions';

export const DOCTOR_PATIENTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authenticatedGuard, permissionGuard],
    data: { permission: PERMISSIONS.doctorPatientsViewOwn },
    loadComponent: () =>
      import(
        './pages/doctor-patients-directory/doctor-patients-directory.component'
      ).then((m) => m.DoctorPatientsDirectoryComponent),
    title: 'routes.doctorPatients',
  },
  {
    path: ':patientId',
    canActivate: [authenticatedGuard, permissionGuard],
    data: { permission: PERMISSIONS.doctorPatientsViewOwn },
    loadComponent: () =>
      import(
        './pages/doctor-patients-directory/doctor-patients-directory.component'
      ).then((m) => m.DoctorPatientsDirectoryComponent),
    title: 'routes.doctorPatients',
  },
];

