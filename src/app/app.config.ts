import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, TitleStrategy } from '@angular/router';
import { LocalizedTitleStrategy } from './core/i18n/localized-title-strategy';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { apiErrorToastInterceptor } from './core/notifications/api-error-toast.interceptor';
import { subscriptionErrorInterceptor } from './domains/subscriptions';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withInterceptors([authInterceptor, apiErrorToastInterceptor, subscriptionErrorInterceptor]),
    ),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: LocalizedTitleStrategy },
  ],
};
