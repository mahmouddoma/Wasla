import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReceptionPracticesApi } from './reception-practices-api';

describe('ReceptionPracticesApi', () => {
  let api: ReceptionPracticesApi;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/api/v1/reception/practices`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ReceptionPracticesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('accepts the documented contract and excludes inactive or unidentified practices', async () => {
    const result = firstValueFrom(api.list());
    http.expectOne(url).flush([
      {
        doctorPracticeId: 'active',
        nameAr: 'Active',
        nameEn: 'Active',
        permissionCodes: ['Search'],
      },
      {
        doctorPracticeId: 'inactive',
        nameAr: 'Inactive',
        isActive: false,
        permissionCodes: ['CheckIn'],
      },
      { nameAr: 'Missing ID', permissionCodes: ['Search'] },
    ]);
    expect((await result).map((p) => ({ id: p.id, codes: p.permissionCodes }))).toEqual([
      { id: 'active', codes: ['Search'] },
    ]);
  });

  it('loads and normalizes the current reception practice context', async () => {
    const result = firstValueFrom(api.list());
    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        doctorPracticeId: 'practice-1',
        practiceNameAr: 'عيادة القلب',
        doctorNameAr: 'دكتور أحمد',
        isActive: true,
        permissionCodes: ['Patients.SearchBasic'],
      },
    ]);

    expect(await result).toEqual([
      {
        id: 'practice-1',
        nameAr: 'عيادة القلب',
        nameEn: null,
        doctorNameAr: 'دكتور أحمد',
        doctorNameEn: null,
        isActive: true,
        permissionCodes: ['Patients.SearchBasic'],
      },
    ]);
  });
});
