import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthApi } from './core/auth/auth-api';
import { AuthSession } from './core/auth/auth-session';
import { firstValueFrom } from 'rxjs';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(async () => {
      const session = inject(AuthSession);
      if (!session.token()) {
        session.clear();
        return;
      }
      try {
        session.complete(await firstValueFrom(inject(AuthApi).currentUser()));
      } catch {
        session.clear();
      }
    }),
    provideRouter(routes),
  ],
};
