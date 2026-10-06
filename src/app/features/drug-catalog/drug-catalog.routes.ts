import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { authenticatedGuard, permissionGuard } from '../../core/auth/auth.guards';
import { AuthSession } from '../../core/auth/auth-session';

const managerGuard: CanActivateFn = () => {
  const session = inject(AuthSession);
  return session.user()?.userType === 'DrugCatalogManager'
    ? true
    : inject(Router).createUrlTree([
        session.user() ? session.destinationFor(session.user()!) : '/login',
      ]);
};
export const DRUG_CATALOG_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authenticatedGuard, managerGuard, permissionGuard],
    data: { permission: 'DrugCatalog.View' },
    title: 'medications.title',
    loadComponent: () =>
      import('./pages/drug-catalog/drug-catalog.component').then((m) => m.DrugCatalogComponent),
  },
  {
    path: 'imports',
    canActivate: [authenticatedGuard, managerGuard, permissionGuard],
    data: { permission: ['DrugCatalog.Import', 'DrugCatalog.ImportHistory'] },
    title: 'imports.title',
    loadComponent: () =>
      import('./pages/drug-imports/drug-imports.component').then((m) => m.DrugImportsComponent),
  },
];
