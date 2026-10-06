import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable } from 'rxjs';
import { PrescriptionsApi } from './prescriptions-api';
import { AddPrescriptionItem, PrescriptionClinicalFields } from './prescription.models';
import { environment } from '../../../environments/environment';
const fields: PrescriptionClinicalFields = {
  strength: null,
  dosageForm: null,
  route: null,
  dose: 'one',
  frequency: null,
  duration: null,
  isPrn: false,
  quantity: null,
  instructions: null,
};
const add: AddPrescriptionItem = {
  ...fields,
  drugCatalogId: 'drug',
  prescriptionRowVersion: 'v+1/=',
};
describe('Prescription HTTP contracts', () => {
  let api: PrescriptionsApi, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PrescriptionsApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  const doctor = '/doctors/me/prescriptions/rx%2F1',
    encounter = '/doctors/me/practices/p%2F1/encounters/e%2F1/prescription/items';
  const cases: readonly [
    string,
    string,
    (api: PrescriptionsApi) => Observable<unknown>,
    string?,
  ][] = [
    ['POST', encounter, (api) => api.addItem('p/1', 'e/1', add, 'intent'), 'intent'],
    [
      'PUT',
      encounter + '/i%2F1',
      (api) => api.updateItem('p/1', 'e/1', 'i/1', { ...fields, prescriptionRowVersion: 'v+1/=' }),
    ],
    ['DELETE', encounter + '/i%2F1', (api) => api.removeItem('p/1', 'e/1', 'i/1', 'v+1/=')],
    ['GET', doctor, (api) => api.details('rx/1')],
    ['GET', doctor + '/versions', (api) => api.versions('rx/1')],
    ['GET', doctor + '/versions/2', (api) => api.versionDetails('rx/1', 2)],
    [
      'POST',
      doctor + '/correction-draft',
      (api) => api.startCorrection('rx/1', { rowVersion: 'v1', reason: 'Correction' }, 'intent'),
      'intent',
    ],
    ['GET', doctor + '/correction-draft', (api) => api.correction('rx/1')],
    [
      'POST',
      doctor + '/correction-draft/items',
      (api) => api.addCorrectionItem('rx/1', add, 'intent'),
      'intent',
    ],
    [
      'PUT',
      doctor + '/correction-draft/items/i%2F1',
      (api) => api.updateCorrectionItem('rx/1', 'i/1', { ...fields, prescriptionRowVersion: 'v1' }),
    ],
    [
      'DELETE',
      doctor + '/correction-draft/items/i%2F1',
      (api) => api.removeCorrectionItem('rx/1', 'i/1', 'v+1/='),
    ],
    [
      'POST',
      doctor + '/correction-draft/finalize',
      (api) => api.finalizeCorrection('rx/1', 'v1', 'intent'),
      'intent',
    ],
    ['POST', doctor + '/correction-draft/discard', (api) => api.discardCorrection('rx/1', 'v1')],
    [
      'POST',
      doctor + '/void',
      (api) => api.voidPrescription('rx/1', { rowVersion: 'v1', reason: 'Void' }, 'intent'),
      'intent',
    ],
    ['GET', '/prescriptions/mine', (api) => api.mine(2)],
    ['GET', '/prescriptions/mine/rx%2F1', (api) => api.myDetails('rx/1')],
  ];
  for (const [method, path, invoke, key] of cases)
    it(method + ' ' + path, () => {
      invoke(api).subscribe();
      const request = http.expectOne(
        (req) => req.url === environment.apiBaseUrl + '/api/v1' + path,
      );
      expect(request.request.method).toBe(method);
      expect(request.request.headers.get('Idempotency-Key')).toBe(key ?? null);
      if (method === 'DELETE') {
        expect(request.request.params.get('rowVersion')).toBe('v+1/=');
        expect(request.request.urlWithParams).toContain('rowVersion=v%2B1/=');
      }
      if (method === 'PUT') {
        expect(request.request.body.dose).toBe('one');
        expect(request.request.body.drugCatalogId).toBeUndefined();
      }
      if (path === '/prescriptions/mine')
        expect(request.request.params.get('pageNumber')).toBe('2');
      request.flush(method === 'DELETE' ? null : {});
    });
});
