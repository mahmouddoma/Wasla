import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, defer, EMPTY, finalize, Observable, shareReplay, tap, timeout } from 'rxjs';
import { AuthApi } from './auth-api';
import { AuthSession } from './auth-session';
import { SKIP_ERROR_TOAST } from '../notifications/api-error-toast.interceptor';

/** Refresh restored account data after the application has rendered. */
@Injectable({ providedIn: 'root' })
export class SessionRevalidation {
  private readonly api = inject(AuthApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly failedToken = signal<string | null>(null);
  readonly checking = signal(false);
  readonly unavailable = computed(() => this.failedToken() !== null && this.failedToken() === this.session.token());
  private pending: { token: string; request: Observable<unknown> } | null = null;

  refresh(): Observable<unknown> {
    const token = this.session.token();
    if (!token) {
      const expired = this.session.session() !== null;
      this.session.clear();
      this.failedToken.set(null);
      if (expired) void this.router.navigateByUrl('/login');
      return EMPTY;
    }
    if (this.pending?.token === token) return this.pending.request;
    const operation = { token, request: EMPTY as Observable<unknown> };
    operation.request = defer(() => {
      this.checking.set(true);
      return this.api.currentUser(new HttpContext().set(SKIP_ERROR_TOAST, true));
    }).pipe(
      timeout(10_000),
      tap((user) => {
        if (this.session.session()?.accessToken !== token) return;
        if (!this.session.token()) { this.invalidate(); return; }
        this.failedToken.set(null);
        const previous = this.session.user();
        this.session.complete(user);
        if (this.session.requiresPasswordChange()) {
          void this.router.navigateByUrl('/change-password');
        } else if (!previous || previous.userType !== user.userType) {
          void this.router.navigateByUrl(this.session.destinationFor(user));
        }
      }),
      catchError((error: unknown) => {
        if (this.session.session()?.accessToken === token) {
          if (!this.session.token() || (error instanceof HttpErrorResponse && [401, 403].includes(error.status))) this.invalidate();
          else this.failedToken.set(token);
        }
        return EMPTY;
      }),
      finalize(() => {
        if (this.pending === operation) { this.pending = null; this.checking.set(false); }
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.pending = operation;
    return operation.request;
  }

  private invalidate(): void {
    this.failedToken.set(null);
    this.session.clear();
    void this.router.navigateByUrl('/login');
  }
}
