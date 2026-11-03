import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../../core/auth/auth-session';
import { LanguageService } from '../../core/i18n/language.service';
import { ToastService } from '../../core/notifications/toast.service';
import { SubscriptionState } from './subscription-state';
import { subscriptionErrorInterceptor } from './subscription-error.interceptor';

describe('subscriptionErrorInterceptor', () => {
  const state = { invalidate: vi.fn(), refresh: vi.fn(async () => null) };
  const toast = { error: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([subscriptionErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: SubscriptionState, useValue: state },
        { provide: ToastService, useValue: toast },
        { provide: AuthSession, useValue: { user: () => ({ userType: 'Doctor' }) } },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('en');
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('explains read-only access and refreshes grants without replaying a mutation', async () => {
    const result = firstValueFrom(
      TestBed.inject(HttpClient).post(`${environment.apiBaseUrl}/api/v1/doctors/me/practices`, {}),
    ).catch((error) => error.status);
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiBaseUrl}/api/v1/doctors/me/practices`)
      .flush(
        { errors: [{ code: 'Subscription.AccessLevelInsufficient' }] },
        { status: 403, statusText: 'Forbidden' },
      );
    expect(await result).toBe(403);
    expect(state.invalidate).toHaveBeenCalledOnce();
    expect(state.refresh).toHaveBeenCalledOnce();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('read-only'));
    TestBed.inject(HttpTestingController).expectNone((req) => req.method === 'POST');
  });
  it('does not turn ordinary permission or patient privacy denial into subscription advice', async () => {
    const result = firstValueFrom(
      TestBed.inject(HttpClient).get(`${environment.apiBaseUrl}/api/v1/patients/records`),
    ).catch((error) => error.status);
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiBaseUrl}/api/v1/patients/records`)
      .flush(
        { errors: [{ code: 'MedicalRecords.AccessDenied' }] },
        { status: 403, statusText: 'Forbidden' },
      );
    expect(await result).toBe(403);
    expect(state.invalidate).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
  it('avoids recursively refreshing a failed own-subscription read', async () => {
    const result = firstValueFrom(
      TestBed.inject(HttpClient).get(`${environment.apiBaseUrl}/api/v1/doctors/me/subscription`),
    ).catch((error) => error.status);
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiBaseUrl}/api/v1/doctors/me/subscription`)
      .flush(
        { errors: [{ code: 'Subscription.Pending' }] },
        { status: 403, statusText: 'Forbidden' },
      );
    expect(await result).toBe(403);
    expect(state.refresh).not.toHaveBeenCalled();
  });
});
