import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/auth.guards';
import { PERMISSIONS } from '../../core/auth/permissions';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'family-relationship-requests/:requestId',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.familyRelationshipRequestsViewDetails },
    loadComponent: () =>
      import('./family-request-details/family-request-details').then(
        (m) => m.FamilyRequestDetailsPage,
      ),
    title: 'مراجعة طلب علاقة عائلية | وصلة',
  },
  {
    path: 'family-relationship-requests',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.familyRelationshipRequestsViewAll },
    loadComponent: () =>
      import('./family-requests-list/family-requests-list').then((m) => m.FamilyRequestsList),
    title: 'طلبات العلاقات العائلية | وصلة',
  },
  {
    path: 'doctor-specialization-requests/:requestId',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.doctorSpecializationRequestsViewDetails },
    loadComponent: () =>
      import('./specialization-request-details/specialization-request-details').then(
        (m) => m.SpecializationRequestDetailsPage,
      ),
    title: 'مراجعة طلب التخصص | وصلة',
  },
  {
    path: 'doctor-specialization-requests',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.doctorSpecializationRequestsViewAll },
    loadComponent: () =>
      import('./specialization-requests-list/specialization-requests-list').then(
        (m) => m.SpecializationRequestsList,
      ),
    title: 'طلبات تخصصات الأطباء | وصلة',
  },
  {
    path: 'medical-specializations/create',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.specializationsCreate },
    loadComponent: () =>
      import('./medical-specialization-details/medical-specialization-details').then(
        (m) => m.MedicalSpecializationDetails,
      ),
    title: 'إضافة تخصص طبي | وصلة',
  },
  {
    path: 'medical-specializations/:id',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.specializationsView },
    loadComponent: () =>
      import('./medical-specialization-details/medical-specialization-details').then(
        (m) => m.MedicalSpecializationDetails,
      ),
    title: 'تفاصيل التخصص الطبي | وصلة',
  },
  {
    path: 'medical-specializations',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.specializationsView },
    loadComponent: () =>
      import('./medical-specializations-list/medical-specializations-list').then(
        (m) => m.MedicalSpecializationsList,
      ),
    title: 'التخصصات الطبية | وصلة',
  },
  {
    path: 'roles/:roleId',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.rolesView },
    loadComponent: () => import('./role-details/role-details').then((m) => m.RoleDetails),
    title: 'صلاحيات الدور | وصلة',
  },
  {
    path: 'roles',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.rolesView },
    loadComponent: () => import('./roles-list/roles-list').then((m) => m.RolesList),
    title: 'الأدوار والصلاحيات | وصلة',
  },
  {
    path: 'superadmins/create',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.superAdminsCreate },
    loadComponent: () =>
      import('./superadmin-create/superadmin-create').then((m) => m.SuperAdminCreate),
    title: 'إنشاء مشرف | وصلة',
  },
  {
    path: 'superadmins/:superAdminId',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.superAdminsViewDetails },
    loadComponent: () =>
      import('./superadmin-details/superadmin-details').then((m) => m.SuperAdminDetails),
    title: 'تفاصيل المشرف | وصلة',
  },
  {
    path: 'superadmins',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.superAdminsViewAll },
    loadComponent: () =>
      import('./superadmins-list/superadmins-list').then((m) => m.SuperAdminsList),
    title: 'إدارة المشرفين | وصلة',
  },
  {
    path: 'doctors/:doctorId',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.doctorsViewDetails },
    loadComponent: () => import('./doctor-details/doctor-details').then((m) => m.DoctorDetails),
    title: 'تفاصيل الطبيب | وصلة',
  },
  {
    path: 'doctors',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.doctorsViewAll },
    loadComponent: () => import('./doctors-list/doctors-list').then((m) => m.DoctorsList),
    title: 'إدارة الأطباء | وصلة',
  },
  { path: '', pathMatch: 'full', redirectTo: 'doctors' },
];
