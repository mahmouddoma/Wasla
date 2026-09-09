import { Routes } from '@angular/router';
import {
  accountAreaGuard,
  anonymousGuard,
  authenticatedGuard,
  doctorOnboardingGuard,
  doctorProfileGuard,
  passwordChangeGuard,
  permissionGuard,
} from './core/auth/auth.guards';
import { PERMISSIONS } from './core/auth/permissions';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/auth/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        canActivate: [anonymousGuard],
        loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
      },
      {
        path: 'register/patient',
        canActivate: [anonymousGuard],
        loadComponent: () =>
          import('./features/auth/patient-registration/patient-registration').then(
            (m) => m.PatientRegistration,
          ),
      },
      {
        path: 'register/doctor',
        canActivate: [anonymousGuard],
        loadComponent: () =>
          import('./features/auth/doctor-registration/doctor-registration').then(
            (m) => m.DoctorRegistration,
          ),
      },
      {
        path: 'forgot-password/otp',
        canActivate: [anonymousGuard],
        loadComponent: () =>
          import('./features/auth/otp-handoff/otp-handoff').then((m) => m.OtpHandoff),
        title: 'تأكيد رمز التحقق | وصلة',
      },
      {
        path: 'forgot-password/reset',
        canActivate: [anonymousGuard],
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password').then((m) => m.ResetPassword),
        title: 'تعيين كلمة مرور جديدة | وصلة',
      },
      {
        path: 'forgot-password',
        canActivate: [anonymousGuard],
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
        title: 'استعادة كلمة المرور | وصلة',
      },
      {
        path: 'change-password',
        canActivate: [passwordChangeGuard],
        loadComponent: () =>
          import('./features/auth/change-password/change-password').then((m) => m.ChangePassword),
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
  {
    path: 'doctor/profile',
    canActivate: [authenticatedGuard, doctorProfileGuard],
    loadComponent: () =>
      import('./features/doctor-profile/doctor-profile').then((m) => m.DoctorProfile),
    title: 'التخصص وموقع الممارسة | وصلة',
  },
  {
    path: 'doctor/onboarding',
    canActivate: [authenticatedGuard, doctorOnboardingGuard],
    loadComponent: () =>
      import('./features/doctor-onboarding/doctor-onboarding').then((m) => m.DoctorOnboarding),
    title: 'حالة اعتماد الطبيب | وصلة',
  },
  {
    path: 'admin',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout').then((m) => m.AdminLayout),
    loadChildren: () =>
      import('./features/admin/admin.routes').then((routes) => routes.ADMIN_ROUTES),
  },
  {
    path: 'reception/patients',
    canActivate: [authenticatedGuard, permissionGuard],
    data: {
      permission: [PERMISSIONS.patientsSearchBasic, PERMISSIONS.patientsRegister],
    },
    loadComponent: () =>
      import('./features/reception/reception-patients/reception-patients').then(
        (m) => m.ReceptionPatients,
      ),
    title: 'إدارة المرضى | وصلة',
  },
  {
    path: 'reception/family-requests',
    canActivate: [authenticatedGuard, permissionGuard],
    data: {
      permission: [
        PERMISSIONS.familyRelationshipRequestsCreateAssisted,
        PERMISSIONS.familyRelationshipRequestsViewAssisted,
        PERMISSIONS.familyRelationshipRequestsResubmitAssisted,
      ],
    },
    loadComponent: () =>
      import('./features/reception/reception-family-requests/reception-family-requests').then(
        (m) => m.ReceptionFamilyRequests,
      ),
    title: 'طلبات العائلة بمساعدة الاستقبال | وصلة',
  },
  {
    path: 'patient/profile',
    canActivate: [authenticatedGuard, permissionGuard],
    data: {
      permission: [
        PERMISSIONS.patientProfileViewOwn,
        PERMISSIONS.patientProfileUpdateOwn,
        PERMISSIONS.patientContactsViewOwn,
        PERMISSIONS.patientContactsManageOwn,
      ],
    },
    loadComponent: () =>
      import('./features/patient/patient-profile/patient-profile').then((m) => m.PatientProfile),
    title: 'ملف المريض | وصلة',
  },
  {
    path: 'patient/family',
    canActivate: [authenticatedGuard, permissionGuard],
    data: {
      permission: [
        PERMISSIONS.familiesViewOwn,
        PERMISSIONS.familyRelationshipRequestsCreate,
        PERMISSIONS.familyRelationshipRequestsViewOwn,
        PERMISSIONS.familyRelationshipRequestsResubmitOwn,
      ],
    },
    loadComponent: () =>
      import('./features/patient/patient-family/patient-family').then((m) => m.PatientFamily),
    title: 'العائلة والطلبات | وصلة',
  },
  {
    path: 'workspace/:area',
    canActivate: [authenticatedGuard, accountAreaGuard],
    loadComponent: () => import('./features/workspace/workspace').then((m) => m.Workspace),
  },
  { path: '**', redirectTo: 'login' },
];
