import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PatientsApi } from './patients-api';

describe('PatientsApi', () => {
  let api: PatientsApi;
  let http: HttpTestingController;
  const url = `${environment.apiBaseUrl}/api/v1/patients`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PatientsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates a healthcare profile without account credentials', async () => {
    const result = firstValueFrom(
      api.create({
        nameAr: 'أحمد',
        nameEn: '',
        dateOfBirth: '2015-01-01',
        gender: 'Male',
        phoneNumber: '',
        email: '',
        primaryContactNameAr: 'محمد',
        primaryContactPhoneNumber: '01000000000',
        primaryContactRelationshipType: 'Father',
        primaryContactIsPrimary: true,
        primaryContactLinkedPatientId: '',
      }),
    );
    const request = http.expectOne(url);
    const body = request.request.body as FormData;
    expect(request.request.method).toBe('POST');
    expect(body.get('NameAr')).toBe('أحمد');
    expect(body.get('PrimaryContactPhoneNumber')).toBe('01000000000');
    expect(body.has('UserName')).toBe(false);
    expect(body.has('Password')).toBe(false);
    request.flush({ patientId: 'patient' });
    await result;
  });

  it('searches with server-side filters and pagination', async () => {
    const result = firstValueFrom(
      api.search({ phoneNumber: '010', name: 'أحمد', pageNumber: 2, pageSize: 20 }),
    );
    const request = http.expectOne(
      (candidate) =>
        candidate.url === `${url}/search` && candidate.params.get('pageNumber') === '2',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('phoneNumber')).toBe('010');
    request.flush({ items: [], pageNumber: 2, pageSize: 20, totalCount: 0 });
    await result;
  });

  it('loads the current profile without a patient id', async () => {
    const result = firstValueFrom(api.profile());
    const request = http.expectOne(`${url}/me`);
    expect(request.request.method).toBe('GET');
    request.flush({ patientId: 'patient' });
    await result;
  });

  it('loads the private profile image as a blob response', async () => {
    const result = firstValueFrom(api.profileImage());
    const request = http.expectOne(`${url}/me/profile-image`);
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob());
    await result;
  });

  it('updates the current profile with the latest rowVersion', async () => {
    const result = firstValueFrom(
      api.updateProfile({
        nameAr: 'أحمد',
        nameEn: '',
        phoneNumber: '010',
        email: '',
        rowVersion: 'AQID',
      }),
    );
    const request = http.expectOne(`${url}/me`);
    expect(request.request.method).toBe('PUT');
    expect((request.request.body as FormData).get('RowVersion')).toBe('AQID');
    request.flush({ patientId: 'patient', rowVersion: 'BAUG' });
    await result;
  });

  it('supports contact list, create, update and soft delete endpoints', async () => {
    const contact = {
      nameAr: 'محمد',
      nameEn: null,
      phoneNumber: '010',
      relationshipType: 'Father' as const,
      linkedPatientId: null,
      isPrimary: true,
    };
    const listResult = firstValueFrom(api.contacts());
    http.expectOne(`${url}/me/contacts`).flush([]);
    await listResult;

    const addResult = firstValueFrom(api.addContact(contact));
    const add = http.expectOne(`${url}/me/contacts`);
    expect(add.request.method).toBe('POST');
    add.flush({ contactId: 'contact' });
    await addResult;

    const updateResult = firstValueFrom(api.updateContact('contact', contact));
    const update = http.expectOne(`${url}/me/contacts/contact`);
    expect(update.request.method).toBe('PUT');
    update.flush({ contactId: 'contact' });
    await updateResult;

    const deleteResult = firstValueFrom(api.deactivateContact('contact'));
    const remove = http.expectOne(`${url}/me/contacts/contact`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
    await deleteResult;
  });
});
