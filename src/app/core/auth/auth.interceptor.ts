import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession } from './auth-session';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(AuthSession);
  const router = inject(Router);
  const hadSession = session.session() !== null;
  const token = session.token();
  if (!token && session.session()) session.clear();
  const isWaslaApi = request.url.startsWith(environment.apiBaseUrl);
  const headers: Record<string, string> = {};
  if (isWaslaApi && !request.headers.has('Accept-Language'))
    headers['Accept-Language'] = document.documentElement.lang === 'en' ? 'en' : 'ar';
  if (isWaslaApi && token && !request.headers.has('Authorization'))
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
        (token !== null || hadSession) &&
        !request.url.endsWith('/login')
      ) {
        session.clear();
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
