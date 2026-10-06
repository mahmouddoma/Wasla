import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageService } from '../../../../core/i18n/language.service';
import { DrugCatalogApi } from '../../../../domains/drug-catalog';
import { PrescriptionsApi, PatientPrescription } from '../../../../domains/prescriptions';
import { PrescriptionsComponent } from './prescriptions.component';
const patient: PatientPrescription = {
  prescriptionId: 'rx1',
  doctor: { id: 'd1', nameAr: 'طبيب', nameEn: 'Doctor' },
  practice: { id: 'p1', nameAr: 'عيادة', nameEn: 'Practice' },
  visitDateUtc: '2026-10-06',
  versionNumber: 1,
  status: 'Finalized',
  items: [],
};
describe('Own patient prescriptions', () => {
  let fixture: ComponentFixture<PrescriptionsComponent>, component: PrescriptionsComponent;
  const api = { mine: vi.fn(), myDetails: vi.fn() };
  beforeEach(async () => {
    vi.resetAllMocks();
    api.mine.mockReturnValue(of({ items: [patient], totalCount: 1, pageNumber: 1, pageSize: 20 }));
    api.myDetails.mockReturnValue(of(patient));
    TestBed.configureTestingModule({
      imports: [PrescriptionsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { actor: 'Patient' } } } },
        { provide: PrescriptionsApi, useValue: api },
        { provide: DrugCatalogApi, useValue: {} },
        {
          provide: AuthSession,
          useValue: { user: () => ({ userType: 'Patient' }), hasPermission: () => true },
        },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('en');
    fixture = TestBed.createComponent(PrescriptionsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));
  it('renders the own list, sends pagination and opens details without navigating away', async () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Doctor');
    fixture.nativeElement.querySelector('tbody button').click();
    await fixture.whenStable();
    expect(api.myDetails).toHaveBeenCalledWith('rx1');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    await component.load(2);
    expect(api.mine).toHaveBeenLastCalledWith(2);
  });
  it('handles denied foreign details safely and supports illustrated empty states', async () => {
    api.myDetails.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    await component.inspect('foreign');
    expect(component.detail()).toBeNull();
    expect(component.messages()).toEqual(['medications.notFound']);
    component.close();
    component.page.set({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.state-empty-illustration')).toBeTruthy();
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
  });
});
