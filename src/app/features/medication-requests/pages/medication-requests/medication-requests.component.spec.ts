import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { DrugCatalogApi } from '../../../../domains/drug-catalog';
import { MedicationRequestsApi, MedicationRequest } from '../../../../domains/medication-requests';
import { MedicationRequestsComponent } from './medication-requests.component';
const request: MedicationRequest = {
  requestId: 'r1',
  medicationName: 'Requested medicine',
  status: 'Pending',
  rowVersion: 'v1',
  history: [],
};
describe('Medication request workflows', () => {
  let fixture: ComponentFixture<MedicationRequestsComponent>,
    component: MedicationRequestsComponent,
    actor: string;
  const api = {
      mine: vi.fn(),
      myDetails: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
      details: vi.fn(),
      approve: vi.fn(),
      reject: vi.fn(),
      requestMoreInfo: vi.fn(),
    },
    toast = { success: vi.fn(), error: vi.fn() };
  async function setup(manager = false) {
    actor = manager ? 'DrugCatalogManager' : 'Doctor';
    TestBed.configureTestingModule({
      imports: [MedicationRequestsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { actor } } } },
        { provide: MedicationRequestsApi, useValue: api },
        {
          provide: DrugCatalogApi,
          useValue: { list: () => of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }) },
        },
        { provide: ToastService, useValue: toast },
        {
          provide: AuthSession,
          useValue: { user: () => ({ userType: actor }), hasPermission: () => true },
        },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('en');
    fixture = TestBed.createComponent(MedicationRequestsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }
  beforeEach(() => {
    vi.resetAllMocks();
    const page = { items: [request], totalCount: 1, pageNumber: 1, pageSize: 20 };
    api.mine.mockReturnValue(of(page));
    api.list.mockReturnValue(of(page));
    api.myDetails.mockReturnValue(of(request));
    api.details.mockReturnValue(of(request));
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));
  it('creates with a medication name only and never sends clinical dosing', async () => {
    await setup();
    expect(component).toBeTruthy();
    component.create();
    await component.save();
    expect(api.create).not.toHaveBeenCalled();
    component.form.controls.medicationName.setValue('New medicine');
    api.create.mockReturnValue(of(request));
    await component.save();
    const data = api.create.mock.calls[0][0];
    expect(data.medicationName).toBe('New medicine');
    expect(data.dose).toBeUndefined();
    expect(data.frequency).toBeUndefined();
    expect(toast.success).toHaveBeenCalled();
  });
  it('opens own details and only permits editing pending or returned requests', async () => {
    await setup();
    fixture.nativeElement.querySelector('tbody button').click();
    await fixture.whenStable();
    expect(api.myDetails).toHaveBeenCalledWith('r1');
    expect(api.details).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(component.canEdit()).toBe(true);
    component.detail.set({ ...request, status: 'Approved' });
    expect(component.canEdit()).toBe(false);
    component.edit();
    expect(component.editing()).toBe(false);
  });
  it('requires review reason and keeps approval idempotent across retries', async () => {
    await setup(true);
    await component.inspect('r1');
    component.prepareReview('approve');
    await component.decide();
    expect(api.approve).not.toHaveBeenCalled();
    component.reason.set('Reviewed');
    api.approve.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await component.decide();
    const key = api.approve.mock.calls[0][2];
    api.approve.mockReturnValue(of({ ...request, status: 'Approved', rowVersion: 'v2' }));
    await component.decide();
    expect(api.approve.mock.calls[1][2]).toBe(key);
    expect(component.canReview()).toBe(false);
    expect(component.review()).toBeNull();
  });
  it('refreshes concurrency conflicts instead of resubmitting stale reviews', async () => {
    await setup(true);
    await component.inspect('r1');
    component.prepareReview('request-more-info');
    component.reason.set('Need strength');
    api.requestMoreInfo.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    api.details.mockReturnValue(of({ ...request, rowVersion: 'v9' }));
    await component.decide();
    expect(component.detail()?.rowVersion).toBe('v9');
    expect(component.review()).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });
  it('renders bilingual empty and error states and denies a foreign actor', async () => {
    await setup();
    component.page.set({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.state-empty-illustration')).toBeTruthy();
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
    actor = 'Patient';
    component.create();
    expect(component.opened()).toBe(false);
  });
});
