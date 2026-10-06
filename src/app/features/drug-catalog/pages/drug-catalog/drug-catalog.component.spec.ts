import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { DrugCatalogApi, DrugCatalogDetails } from '../../../../domains/drug-catalog';
import { DrugCatalogComponent } from './drug-catalog.component';
const drug: DrugCatalogDetails = {
  drugCatalogId: 'd1',
  commercialNameEn: 'Synthetic medication',
  commercialNameAr: 'دواء اختباري',
  scientificName: null,
  manufacturer: null,
  drugClass: null,
  route: null,
  strengthText: null,
  dosageForm: null,
  priceEgp: 0,
  status: 'Active',
  rowVersion: 'dv1',
  history: [{ action: 'Created', createdOnUtc: '2026-10-06T09:00:00Z' }],
};
const target: DrugCatalogDetails = {
  ...drug,
  drugCatalogId: 'd2',
  commercialNameEn: 'Synthetic target',
};
describe('Drug catalog manager UI', () => {
  let fixture: ComponentFixture<DrugCatalogComponent>, component: DrugCatalogComponent;
  let actor: string, permissions: boolean;
  const api = {
    list: vi.fn(),
    details: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    merge: vi.fn(),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(async () => {
    vi.resetAllMocks();
    actor = 'DrugCatalogManager';
    permissions = true;
    api.list.mockReturnValue(
      of({ items: [drug, target], totalCount: 2, pageNumber: 1, pageSize: 20 }),
    );
    api.details.mockReturnValue(of(drug));
    TestBed.configureTestingModule({
      imports: [DrugCatalogComponent],
      providers: [
        provideRouter([]),
        { provide: DrugCatalogApi, useValue: api },
        { provide: ToastService, useValue: toast },
        {
          provide: AuthSession,
          useValue: { user: () => ({ userType: actor }), hasPermission: () => permissions },
        },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('en');
    fixture = TestBed.createComponent(DrugCatalogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));
  it('renders the catalog and inspects details and history in the shared drawer', async () => {
    expect(component).toBeTruthy();
    fixture.nativeElement.querySelector('tbody button').click();
    await fixture.whenStable();
    expect(api.details).toHaveBeenCalledWith('d1');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Change history');
    expect(fixture.nativeElement.textContent).not.toContain('medications.history.Created');
  });
  it('sends search, status and page changes to the API', async () => {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    select.value = 'NeedsReview';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(api.list).toHaveBeenLastCalledWith({
      pageNumber: 1,
      pageSize: 20,
      status: 'NeedsReview',
    });
    await component.load(2);
    expect(api.list).toHaveBeenLastCalledWith({
      pageNumber: 2,
      pageSize: 20,
      status: 'NeedsReview',
    });
  });
  it('denies catalog mutations to other actors or missing permissions', async () => {
    actor = 'SuperAdmin';
    component.create();
    expect(component.opened()).toBe(false);
    actor = 'DrugCatalogManager';
    permissions = false;
    await component.inspect('d1');
    expect(api.details).not.toHaveBeenCalled();
  });
  it('validates required name and sends zero reference price without treating it as missing', async () => {
    component.create();
    await component.save();
    expect(api.create).not.toHaveBeenCalled();
    component.form.controls.commercialNameEn.setValue('New medication');
    component.form.controls.priceEgp.setValue(0);
    api.create.mockReturnValue(of(drug));
    await component.save();
    expect(api.create.mock.calls[0][0].priceEgp).toBe(0);
    expect(component.detail()?.rowVersion).toBe('dv1');
    expect(toast.success).toHaveBeenCalledWith('medications.saved');
  });
  it('blocks source/self/inactive merge targets and searches active targets on the server', async () => {
    await component.inspect('d1');
    component.prepareAction('merge');
    await fixture.whenStable();
    expect(api.list).toHaveBeenCalledWith({
      search: '',
      status: 'Active',
      pageNumber: 1,
      pageSize: 20,
    });
    component.chooseTarget('d1');
    expect(component.targetId()).toBe('');
    component.targets.set({
      items: [{ ...target, status: 'Inactive' }],
      totalCount: 1,
      pageNumber: 1,
      pageSize: 20,
    });
    component.chooseTarget('d2');
    expect(component.targetId()).toBe('');
    component.targets.set({ items: [target], totalCount: 1, pageNumber: 1, pageSize: 20 });
    component.chooseTarget('d2');
    expect(component.targetId()).toBe('d2');
  });
  it('keeps merge intent stable across a transient retry and refreshes history after success', async () => {
    await component.inspect('d1');
    component.prepareAction('merge');
    await fixture.whenStable();
    component.chooseTarget('d2');
    component.reason.set('Duplicate');
    api.merge.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await component.executeAction();
    const key = api.merge.mock.calls[0][3];
    api.merge.mockReturnValue(of({ ...drug, status: 'Merged', targetDrugCatalogId: 'd2' }));
    api.details.mockReturnValue(
      of({ ...drug, status: 'Merged', rowVersion: 'dv2', targetDrugCatalogId: 'd2' }),
    );
    await component.executeAction();
    expect(api.merge.mock.calls[1][3]).toBe(key);
    expect(component.detail()?.rowVersion).toBe('dv2');
    expect(component.detail()?.status).toBe('Merged');
  });
  it('refetches current server state on 409 and requires review before another mutation', async () => {
    await component.inspect('d1');
    component.edit();
    component.reason.set('Correction');
    api.update.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    api.details.mockReturnValue(of({ ...drug, rowVersion: 'dv9' }));
    await component.save();
    expect(component.detail()?.rowVersion).toBe('dv9');
    expect(component.editing()).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });
  it('renders loading, illustrated empty, error and Arabic states', async () => {
    component.page.set({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.state-empty-illustration')).toBeTruthy();
    component.loading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
    component.loading.set(false);
    component.failed.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Could not load');
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
  });
  it('prevents duplicate submit while a mutation is pending', async () => {
    await component.inspect('d1');
    component.edit();
    component.reason.set('Correction');
    const pending = new Subject<DrugCatalogDetails>();
    api.update.mockReturnValue(pending);
    const save = component.save();
    await component.save();
    expect(api.update).toHaveBeenCalledTimes(1);
    pending.next(drug);
    pending.complete();
    await save;
  });
});
