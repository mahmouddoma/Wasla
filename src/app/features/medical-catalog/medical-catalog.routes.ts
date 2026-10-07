import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/auth.guards';

export const MEDICAL_CATALOG_ROUTES: Routes = (['lab', 'radiology'] as const).flatMap((kind) => {
  const prefix = kind === 'lab' ? 'Lab' : 'Radiology';
  return [
    {
      path: kind,
      canActivate: [permissionGuard],
      data: { kind, actor: 'MedicalCatalogManager', permission: prefix + 'Catalog.View' },
      title: `diagnostics.${kind}Catalog`,
      loadComponent: () =>
        import('./pages/catalog/catalog.component').then((m) => m.CatalogComponent),
    },
    {
      path: `${kind}/imports`,
      canActivate: [permissionGuard],
      data: {
        kind,
        actor: 'MedicalCatalogManager',
        permission: [prefix + 'Catalog.Import', prefix + 'Catalog.ImportHistory'],
      },
      title: `diagnostics.${kind}Imports`,
      loadComponent: () =>
        import('./pages/imports/imports.component').then((m) => m.ImportsComponent),
    },
    {
      path: `${kind}/requests`,
      canActivate: [permissionGuard],
      data: { kind, actor: 'MedicalCatalogManager', permission: prefix + 'CatalogRequests.View' },
      title: `diagnostics.${kind}CatalogRequests`,
      loadComponent: () =>
        import('./pages/requests/requests.component').then((m) => m.CatalogRequestsComponent),
    },
  ];
});
export const DOCTOR_CATALOG_REQUEST_ROUTES: Routes = (['lab', 'radiology'] as const).map(
  (kind) => ({
    path: kind,
    canActivate: [permissionGuard],
    data: {
      kind,
      actor: 'Doctor',
      permission: [
        (kind === 'lab' ? 'Lab' : 'Radiology') + 'CatalogRequests.ViewOwn',
        (kind === 'lab' ? 'Lab' : 'Radiology') + 'CatalogRequests.CreateOwn',
      ],
    },
    title: `diagnostics.${kind}CatalogRequests`,
    loadComponent: () =>
      import('./pages/requests/requests.component').then((m) => m.CatalogRequestsComponent),
  }),
);
