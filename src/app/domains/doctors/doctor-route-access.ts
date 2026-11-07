import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, EMPTY, from, Observable, of, switchMap } from 'rxjs';
import { AuthSession } from '../../core/auth/auth-session';
import { SubscriptionState } from '../subscriptions';
import { DoctorApi } from './doctor-api';

/** Reconciles account access after activation; the backend authorizes every resource. */
@Injectable({ providedIn: 'root' })
export class DoctorRouteAccess {
  private readonly router = inject(Router);
  private readonly session = inject(AuthSession);
  private readonly api = inject(DoctorApi);
  private readonly subscription = inject(SubscriptionState);

  watch(): Observable<unknown> {
    return this.router.events.pipe(
      // Any subsequent navigation cancels the previous approval read and redirect.
      switchMap((event) => {
        if (!(event instanceof NavigationEnd)) return EMPTY;
        const url = event.urlAfterRedirects;
        if (
          this.session.user()?.userType !== 'Doctor' ||
          !/^\/(?:doctor|workspace\/doctor|diagnostics\/doctor)(?:\/|\?|$)/.test(url) ||
          /^\/doctor\/(?:onboarding|profile|subscription)(?:\/|\?|$)/.test(url)
        )
          return EMPTY;

        return this.api.onboardingStatus().pipe(
          catchError(() => of(null)),
          switchMap((status) => {
            if (status?.approvalStatus !== 'Approved') {
              return from(this.router.navigateByUrl('/doctor/onboarding'));
            }
            return from(this.subscription.refresh(true)).pipe(catchError(() => EMPTY));
          }),
        );
      }),
    );
  }
}
