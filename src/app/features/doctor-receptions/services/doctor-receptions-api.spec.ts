import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DoctorReceptionsApi } from './doctor-receptions-api';

describe('DoctorReceptionsApi', () => {
  let api: DoctorReceptionsApi;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/api/v1/doctors/me/receptions`;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(DoctorReceptionsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads list/details and creates the identity without a practice', async () => {
    const list = firstValueFrom(api.list());
    http.expectOne(url).flush([]);
    await list;
    const details = firstValueFrom(api.details('reception/1'));
    http.expectOne(`${url}/reception%2F1`).flush({ id: 'reception-1', assignments: [] });
    await details;
    const body = {
      userName: 'desk.one',
      email: 'desk@example.com',
      phoneNumber: null,
      temporaryPassword: 'Temp#1234',
      nameAr: 'موظف استقبال',
      nameEn: null,
    };
    const create = firstValueFrom(api.create(body));
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.doctorPracticeId).toBeUndefined();
    request.flush({ id: 'reception-1' });
    await create;
  });

  it('creates, updates, activates and deactivates one assignment', async () => {
    const create = firstValueFrom(
      api.assign('reception-1', {
        doctorPracticeId: 'practice-1',
        permissionIds: ['permission-1'],
      }),
    );
    http.expectOne(`${url}/reception-1/assignments`).flush({ id: 'assignment-1' });
    await create;
    const update = firstValueFrom(
      api.updateAssignment('reception-1', 'assignment-1', {
        permissionIds: ['permission-2'],
        rowVersion: 'AQID',
      }),
    );
    const updateRequest = http.expectOne(`${url}/reception-1/assignments/assignment-1`);
    expect(updateRequest.request.body.rowVersion).toBe('AQID');
    updateRequest.flush({});
    await update;
    const activate = firstValueFrom(
      api.activateAssignment('reception-1', 'assignment-1', { rowVersion: 'BAUG' }),
    );
    http.expectOne(`${url}/reception-1/assignments/assignment-1/activate`).flush({});
    await activate;
    const deactivate = firstValueFrom(
      api.deactivateAssignment('reception-1', 'assignment-1', { rowVersion: 'CAkK' }),
    );
    const deactivateRequest = http.expectOne(
      `${url}/reception-1/assignments/assignment-1/deactivate`,
    );
    expect(deactivateRequest.request.body).toEqual({ rowVersion: 'CAkK' });
    deactivateRequest.flush({});
    await deactivate;
  });
  it('fetches the catalogue of available assignment permissions', async () => {
    const permissions = firstValueFrom(api.listPermissions());
    const request = http.expectOne(`${url}/assignable-permissions`);
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 'perm-1', code: 'DoctorReception.Queue.Call' }]);
    await expect(permissions).resolves.toEqual([
      { id: 'perm-1', code: 'DoctorReception.Queue.Call' },
    ]);
  });
});
