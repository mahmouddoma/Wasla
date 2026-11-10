import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession } from './auth-session';
import { backendRequestUrl } from '../http/backend-request-url';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AuthSession);
  const router = inject(Router);
  const hadSession = session.session() !== null;
  const token = session.token();
  const apiUrl = backendRequestUrl(request.url, environment.apiBaseUrl);
  const isWaslaApi = apiUrl !== null;
  if (isWaslaApi && !token && session.session()) session.clear();
  const isAnonymousOnboarding = apiUrl !== null && /\/api\/v1\/patient-onboarding(?:\/|$)/.test(apiUrl.pathname);
  const headers: Record<string, string> = {};
  if (isWaslaApi && !request.headers.has('Accept-Language'))
    headers['Accept-Language'] = typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'ar';
  if (isWaslaApi && !isAnonymousOnboarding && token && !request.headers.has('Authorization'))
    headers['Authorization'] = `Bearer ${token}`;
  const authorizedRequest = Object.keys(headers).length
    ? request.clone({ setHeaders: headers })
    : request;
  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isWaslaApi &&
        !isAnonymousOnboarding &&
        (token !== null || hadSession) &&
        session.token() === token &&
        !/\/api\/v1\/auth\/login\/?$/.test(apiUrl?.pathname ?? '')
      ) {
        session.clear();
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
