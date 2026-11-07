import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { parseApiErrors } from '../../core/auth/api-errors';
import { AuthSession } from '../../core/auth/auth-session';
import { LanguageService } from '../../core/i18n/language.service';
import { SKIP_ERROR_TOAST } from '../../core/notifications/api-error-toast.interceptor';
import { ToastService } from '../../core/notifications/toast.service';
import { SubscriptionState } from './subscription-state';

export const subscriptionErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const state = inject(SubscriptionState);
  const session = inject(AuthSession);
  const language = inject(LanguageService);
  const toast = inject(ToastService);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        request.url.startsWith(`${environment.apiBaseUrl}/api/v1/`) &&
        error instanceof HttpErrorResponse
      ) {
        const parsed = parseApiErrors(error);
        const commercial = parsed.codes.some(
          (code) =>
            /^Subscription\./.test(code) ||
            /(?:PracticeLimitReached|ReceptionLimitReached|PaymentAlreadyRecorded|ChangeRequestAlreadyPending)$/.test(
              code,
            ),
        );
        if (commercial && [403, 409].includes(error.status)) {
          state.invalidate();
          if (
            session.user()?.userType === 'Doctor' &&
            !/\/subscriptions?(?:\/|\?|$)/.test(request.url) &&
            !request.url.includes('/subscription-allocation')
          ) {
            state.markRouteDenied?.(typeof window !== 'undefined' ? window.location.pathname : '');
            void state
              .refresh()
              .then(() => {
                const practiceId = request.url.match(/\/doctors\/me\/practices\/([^/?]+)/)?.[1];
                return practiceId ? state.refreshPractice(decodeURIComponent(practiceId)) : null;
              })
              .catch(() => undefined);
          }
          if (!request.context.get(SKIP_ERROR_TOAST)) {
            request.context.set(SKIP_ERROR_TOAST, true);
            const key = parsed.codes.some((code) => code.endsWith('AccessLevelInsufficient'))
              ? 'subscriptions.readOnlyDenied'
              : parsed.codes.some((code) => code.endsWith('FeatureNotEntitled'))
                ? 'subscriptions.featureDenied'
                : parsed.codes.some((code) => /LimitReached$/.test(code))
                  ? 'subscriptions.capacityFull'
                  : error.status === 403
                    ? 'subscriptions.stateDenied'
                    : (parsed.messages[0] ?? 'common.requestFailed');
            toast.error(
              language.t(
                error.status === 403 && session.user()?.userType === 'Patient'
                  ? 'booking.practiceUnavailable'
                  : error.status === 403 && session.user()?.userType === 'Reception'
                    ? 'subscriptions.staffFeatureDenied'
                    : key,
              ),
            );
          }
        } else if (
          error.status === 403 &&
          request.method === 'GET' &&
          session.user()?.userType === 'Doctor' &&
          /\/doctors\/me\//.test(request.url) &&
          !/\/(?:subscriptions?|onboarding|profile)(?:\/|\?|$)/.test(request.url)
        ) {
          request.context.set(SKIP_ERROR_TOAST, true);
          state.markRouteDenied?.(typeof window !== 'undefined' ? window.location.pathname : '');
          setTimeout(() => toast.clearErrors?.(), 0);
        }
      }
      return throwError(() => error);
    }),
  );
};
