import { Routes } from '@angular/router';
import { authenticatedGuard, permissionGuard } from '../../core/auth/auth.guards';

export const FINANCE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./pages/finance-workspace/finance-workspace').then((m) => m.FinanceWorkspace),
    title: 'finance.title',
  },
];

export const ADMIN_FINANCE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authenticatedGuard, permissionGuard],
    data: { actor: 'Admin', view: 'revenue', permission: 'PlatformRevenue.ViewAggregates' },
    loadComponent: () => import('./pages/finance-workspace/finance-workspace').then((m) => m.FinanceWorkspace),
    title: 'finance.revenue.title',
  },
];
