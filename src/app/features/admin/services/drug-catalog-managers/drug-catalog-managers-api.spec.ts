import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import { CATALOG_MANAGER_KIND, DrugCatalogManagersApi } from './drug-catalog-managers-api';
describe.each(['drug', 'medical'] as const)(
  '%s catalog account governance HTTP contracts',
  (kind) => {
    let api: DrugCatalogManagersApi, http: HttpTestingController;
    const root = environment.apiBaseUrl + `/api/v1/admin/${kind}-catalog-managers`;
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: CATALOG_MANAGER_KIND, useValue: kind },
        ],
      });
      api = TestBed.inject(DrugCatalogManagersApi);
      http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => http.verify());
    it('searches and paginates accounts on the dedicated governance endpoint', () => {
      api.list('  manager  ', 2).subscribe();
      const request = http.expectOne((r) => r.url === root);
      expect(request.request.params.get('search')).toBe('manager');
      expect(request.request.params.get('pageNumber')).toBe('2');
      expect(request.request.params.get('pageSize')).toBe('20');
      request.flush({});
    });
    it('fetches details, creates an account and updates contact data only', () => {
      api.details('m1').subscribe();
      http.expectOne(root + '/m1').flush({});
      const body = {
        userName: 'manager',
        email: 'test@example.invalid',
        phoneNumber: null,
        initialPassword: 'Example123!',
        confirmPassword: 'Example123!',
      };
      api.create(body).subscribe();
      const create = http.expectOne(root);
      expect(create.request.method).toBe('POST');
      expect(create.request.body).toEqual(body);
      create.flush({});
      api.update('m1', { email: 'new@example.invalid', phoneNumber: null }).subscribe();
      const update = http.expectOne(root + '/m1');
      expect(update.request.method).toBe('PUT');
      expect(update.request.body).toEqual({ email: 'new@example.invalid', phoneNumber: null });
      update.flush({});
    });
    it.each(['activate', 'deactivate'] as const)('changes %s without a request body', (action) => {
      api[action]('m1').subscribe();
      const request = http.expectOne(root + '/m1/' + action);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toBeNull();
      request.flush({});
    });
  },
);
