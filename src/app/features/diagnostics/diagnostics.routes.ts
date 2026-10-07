import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/auth.guards';

export const DIAGNOSTIC_ROUTES: Routes = (['Doctor', 'Patient'] as const).flatMap((actor) =>
  (['lab', 'radiology'] as const).map((kind) => {
    const prefix = kind === 'lab' ? 'Lab' : 'Radiology';
    return {
      path: `${actor.toLowerCase()}/${kind}`,
      canActivate: [permissionGuard],
      data: {
        kind,
        actor,
        permission:
          actor === 'Doctor'
            ? [
                prefix + 'Requests.ViewOwn',
                prefix + 'Results.ViewOwn',
                prefix + 'ResultSubmissions.ViewOwn',
              ]
            : [prefix + 'Requests.ViewOwnIssued', prefix + 'Results.ViewOwnCurrent'],
      },
      title: `diagnostics.${kind}Requests`,
      loadComponent: () =>
        import('./pages/diagnostic-workspace/diagnostic-workspace.component').then(
          (m) => m.DiagnosticWorkspaceComponent,
        ),
    };
  }),
);
