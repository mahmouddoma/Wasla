import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, TitleStrategy } from '@angular/router';
import { LocalizedTitleStrategy } from './core/i18n/localized-title-strategy';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { apiErrorToastInterceptor } from './core/notifications/api-error-toast.interceptor';
import { AuthApi } from './core/auth/auth-api';
import { AuthSession } from './core/auth/auth-session';
import { firstValueFrom } from 'rxjs';
import { SubscriptionState, subscriptionErrorInterceptor } from './domains/subscriptions';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor, apiErrorToastInterceptor, subscriptionErrorInterceptor])),
    provideAppInitializer(async () => {
      const session = inject(AuthSession);
      const subscription = inject(SubscriptionState);
      if (!session.token()) {
        session.clear();
        return;
      }
      try {
        session.complete(await firstValueFrom(inject(AuthApi).currentUser()));
        if (session.user()?.userType === 'Doctor') await subscription.refresh().catch(() => undefined);
      } catch {
        session.clear();
      }
    }),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: LocalizedTitleStrategy },
  ],
};
