import { Routes } from '@angular/router';

export const LEGAL_ROUTES: Routes = [
  {
    path: 'privacy',
    title: 'legal.tabPrivacy',
    loadComponent: () =>
      import('./pages/privacy-policy/privacy-policy.component').then(
        (m) => m.PrivacyPolicyComponent,
      ),
  },
  {
    path: 'terms',
    title: 'legal.tabTerms',
    loadComponent: () =>
      import('./pages/terms-of-service/terms-of-service.component').then(
        (m) => m.TermsOfServiceComponent,
      ),
  },
  {
    path: 'help',
    title: 'legal.tabHelp',
    loadComponent: () =>
      import('./pages/help-support/help-support.component').then((m) => m.HelpSupportComponent),
  },
];
