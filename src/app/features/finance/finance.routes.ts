import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { AuthSession } from '../../core/auth/auth-session';
import { authenticatedGuard, permissionGuard } from '../../core/auth/auth.guards';
import { receptionPracticeGuard } from '../../domains/reception-practices';

export const FINANCE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      authenticatedGuard,
      (route, state) =>
        inject(AuthSession).user()?.userType === 'Reception'
          ? receptionPracticeGuard(route, state)
          : permissionGuard(route, state),
    ],
    loadComponent: () =>
      import('./pages/finance-workspace/finance-workspace').then((m) => m.FinanceWorkspace),
    title: 'finance.title',
  },
];
