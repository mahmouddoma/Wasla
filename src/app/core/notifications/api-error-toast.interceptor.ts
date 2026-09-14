import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { parseApiErrors } from '../auth/api-errors';
import { ToastService } from './toast.service';

export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export const apiErrorToastInterceptor: HttpInterceptorFn = (request, next) => {
  const toast = inject(ToastService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (request.context.get(SKIP_ERROR_TOAST)) {
        return throwError(() => error);
      }

      if (error instanceof HttpErrorResponse) {
        const parsed = parseApiErrors(error);
        const messages = [...parsed.messages, ...Object.values(parsed.fields).flat()];
        for (const message of new Set(messages)) toast.error(message);
      }

      return throwError(() => error);
    }),
  );
};
