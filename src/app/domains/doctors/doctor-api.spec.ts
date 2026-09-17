import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DoctorApi } from './doctor-api';

describe('DoctorApi', () => {
  it('loads the current doctor onboarding endpoint without a doctor id', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(DoctorApi);
    const http = TestBed.inject(HttpTestingController);
    const result = firstValueFrom(api.onboardingStatus());
    const request = http.expectOne(`${environment.apiBaseUrl}/api/v1/doctors/me/onboarding`);

    expect(request.request.method).toBe('GET');
    request.flush({
      doctorId: '1bbac680-bda0-4cb0-b531-7cc1d61e22b6',
      approvalStatus: 'Pending',
      rejectionReason: null,
      suspensionReason: null,
      approvedOnUtc: null,
      hasProfileImage: true,
      rowVersion: 'AQID',
    });
    await result;
    http.verify();
  });
});
