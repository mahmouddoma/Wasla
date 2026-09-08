import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthApi } from './auth-api';

describe('AuthApi password recovery', () => {
  let api: AuthApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AuthApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts requestId and otp only when verifying an OTP', async () => {
    const body = {
      requestId: '1bbac680-bda0-4cb0-b531-7cc1d61e22b6',
      otp: '123456',
    };
    const result = firstValueFrom(api.verifyPasswordResetOtp(body));
    const request = http.expectOne(
      `${environment.apiBaseUrl}/api/v1/auth/forgot-password/verify-otp`,
    );

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({
      requestId: body.requestId,
      resetToken: 'opaque-token',
      expiresOnUtc: new Date(Date.now() + 60_000).toISOString(),
    });
    await result;
  });

  it('posts the complete reset contract', async () => {
    const body = {
      requestId: '1bbac680-bda0-4cb0-b531-7cc1d61e22b6',
      resetToken: 'opaque-token',
      newPassword: 'RecoveredPass123',
      confirmPassword: 'RecoveredPass123',
    };
    const result = firstValueFrom(api.resetPassword(body));
    const request = http.expectOne(`${environment.apiBaseUrl}/api/v1/auth/forgot-password/reset`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(null, { status: 204, statusText: 'No Content' });
    await result;
  });
});
