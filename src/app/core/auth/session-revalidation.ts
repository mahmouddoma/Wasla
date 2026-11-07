import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, EMPTY, Observable, tap } from 'rxjs';
import { AuthApi } from './auth-api';
import { AuthSession } from './auth-session';

/** Refresh restored account data after the application has rendered. */
@Injectable({ providedIn: 'root' })
export class SessionRevalidation {
  private readonly api = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  refresh(): Observable<unknown> {
    const token = this.session.token();
    if (!token) {
      this.session.clear();
      return EMPTY;
    }
    return this.api.currentUser().pipe(
      tap((user) => {
        if (this.session.token() !== token) return;
        const previous = this.session.user();
        this.session.complete(user);
        if (this.session.requiresPasswordChange()) {
          void this.router.navigateByUrl('/change-password');
        } else if (!previous || previous.userType !== user.userType) {
          void this.router.navigateByUrl(this.session.destinationFor(user));
        }
      }),
      catchError(() => {
        if (this.session.token() === token) {
          this.session.clear();
          void this.router.navigateByUrl('/login');
        }
        return EMPTY;
      }),
    );
  }
}
