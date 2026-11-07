import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, EMPTY, from, Observable, switchMap } from 'rxjs';
import { AuthSession } from '../../core/auth/auth-session';
import { ReceptionPracticeContext } from './reception-practice-context';

/** Delegated permissions are loaded without holding navigation open. */
@Injectable({ providedIn: 'root' })
export class ReceptionRouteAccess {
  private readonly router = inject(Router);
  private readonly session = inject(AuthSession);
  private readonly context = inject(ReceptionPracticeContext);

  watch(): Observable<unknown> {
    return this.router.events.pipe(
      switchMap((event) => {
        if (!(event instanceof NavigationEnd)) return EMPTY;
        const user = this.session.user();
        if (user?.userType !== 'Reception') return EMPTY;
        let route = this.router.routerState.snapshot.root;
        while (route.firstChild) route = route.firstChild;
        const required: unknown = [...route.pathFromRoot]
          .reverse()
          .map((snapshot) => snapshot.data['practicePermission'])
          .find((value) => value !== undefined);
        const permissions =
          typeof required === 'string'
            ? [required]
            : Array.isArray(required)
              ? required.filter((value): value is string => typeof value === 'string')
              : [];
        if (!permissions.length) return EMPTY;

        return from(this.context.ensureLoaded()).pipe(
          switchMap(() => {
            if (
              !this.session.isAuthenticated() ||
              this.session.user()?.applicationUserId !== user.applicationUserId
            )
              return EMPTY;
            if (this.session.requiresPasswordChange()) {
              return from(this.router.navigateByUrl('/change-password'));
            }
            return this.context.hasAnyPracticeWithAnyPermission(permissions)
              ? EMPTY
              : from(this.router.navigateByUrl(this.session.destinationFor(user)));
          }),
          catchError(() => EMPTY),
        );
      }),
    );
  }
}
