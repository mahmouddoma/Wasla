import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../../core/auth/auth-session';
import { ToastService } from '../../../../core/notifications/toast.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { DrugCatalogApi, DrugCatalogItem } from '../../../../domains/drug-catalog';
import { PrescriptionsApi, PrescriptionState } from '../../../../domains/prescriptions';
import { PrescriptionWorkspaceComponent } from './prescription-workspace.component';
const drug: DrugCatalogItem = {
  drugCatalogId: 'd1',
  commercialNameEn: 'Catalog medicine',
  commercialNameAr: null,
  scientificName: null,
  manufacturer: null,
  drugClass: null,
  route: null,
  strengthText: null,
  dosageForm: null,
  priceEgp: 0,
  status: 'Active',
  rowVersion: 'dv1',
};
const item = {
  itemId: 'i1',
  medicationName: 'Medicine',
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
const state: PrescriptionState = {
  prescriptionId: 'rx1',
  practiceId: 'p1',
  medicalEncounterId: 'e1',
  rowVersion: 'v1',
  current: null,
  draft: { versionNumber: 1, status: 'Draft', items: [item] },
  capabilities: {
    canManageDraft: true,
    canCorrect: true,
    canFinalizeCorrection: true,
    canDiscardCorrection: true,
    canVoid: true,
  },
  completionBlockers: [],
};
describe('Prescription editing, correction and privacy', () => {
  it('blocks prescription changes while the parent encounter is saving', async () => {
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    component.beginAdd();
    expect(component.editing()).toBe(false);
    component.ask('remove', 'i1');
    await component.confirm();
    expect(api.removeItem).not.toHaveBeenCalled();
  });
  let fixture: ComponentFixture<PrescriptionWorkspaceComponent>,
    component: PrescriptionWorkspaceComponent,
    actor: string;
  const api = {
      addItem: vi.fn(),
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      details: vi.fn(),
      startCorrection: vi.fn(),
      correction: vi.fn(),
      addCorrectionItem: vi.fn(),
      removeCorrectionItem: vi.fn(),
      finalizeCorrection: vi.fn(),
      discardCorrection: vi.fn(),
      voidPrescription: vi.fn(),
      versions: vi.fn(),
      versionDetails: vi.fn(),
    },
    toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(async () => {
    vi.resetAllMocks();
    actor = 'Doctor';
    TestBed.configureTestingModule({
      imports: [PrescriptionWorkspaceComponent],
      providers: [
        { provide: PrescriptionsApi, useValue: api },
        {
          provide: DrugCatalogApi,
          useValue: {
            searchActive: () => of({ items: [drug], totalCount: 1, pageNumber: 1, pageSize: 20 }),
          },
        },
        { provide: ToastService, useValue: toast },
        {
          provide: AuthSession,
          useValue: { user: () => ({ userType: actor }), hasPermission: () => true },
        },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('en');
    fixture = TestBed.createComponent(PrescriptionWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('initial', state);
    fixture.componentRef.setInput('practiceId', 'p1');
    fixture.componentRef.setInput('encounterId', 'e1');
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('canRequest', true);
    await fixture.whenStable();
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));
  it('adds exactly one catalog source with the current root token and a stable retry intent', async () => {
    expect(component).toBeTruthy();
    component.beginAdd();
    component.choose(drug);
    api.addItem.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await component.saveItem();
    const key = api.addItem.mock.calls[0][3];
    api.addItem.mockReturnValue(of({ ...state, rowVersion: 'v2' }));
    await component.saveItem();
    expect(api.addItem.mock.calls[1][3]).toBe(key);
    expect(api.addItem.mock.calls[0][2]).toMatchObject({
      drugCatalogId: 'd1',
      prescriptionRowVersion: 'v1',
    });
    expect(api.addItem.mock.calls[0][2].newMedication).toBeUndefined();
    expect(component.state()?.rowVersion).toBe('v2');
  });
  it('creates a missing medication and its prescription item in one call', async () => {
    component.beginAdd();
    component.useMissing();
    component.medication.controls.medicationName.setValue('Missing medicine');
    component.clinical.controls.dose.setValue('one');
    api.addItem.mockReturnValue(of(state));
    await component.saveItem();
    const data = api.addItem.mock.calls[0][2];
    expect(data.newMedication.medicationName).toBe('Missing medicine');
    expect(data.drugCatalogId).toBeUndefined();
    expect(data.dose).toBe('one');
    expect(data.newMedication.dose).toBeUndefined();
  });
  it('updates clinical values without changing the medication identity', async () => {
    component.editItem(item);
    component.clinical.controls.dose.setValue('two');
    api.updateItem.mockReturnValue(of(state));
    await component.saveItem();
    expect(api.updateItem.mock.calls[0][3]).toMatchObject({
      dose: 'two',
      prescriptionRowVersion: 'v1',
    });
    expect(api.updateItem.mock.calls[0][3].drugCatalogId).toBeUndefined();
  });
  it('removing the last initial item emits null and allows a new lazy draft', async () => {
    const changed = vi.fn();
    component.changed.subscribe(changed);
    component.ask('remove', 'i1');
    api.removeItem.mockReturnValue(of(null));
    await component.confirm();
    expect(component.state()).toBeNull();
    expect(changed).toHaveBeenCalledWith(null);
    expect(component.editable()).toBe(true);
  });
  it('keeps an empty correction draft and requires explicit discard', async () => {
    component.state.set({
      ...state,
      current: { versionNumber: 1, status: 'Finalized', items: [item] },
      draft: { versionNumber: 2, status: 'Draft', items: [item] },
    });
    component.correctionMode.set(true);
    component.ask('remove', 'i1');
    api.removeCorrectionItem.mockReturnValue(
      of({ ...component.state()!, draft: { versionNumber: 2, status: 'Draft', items: [] } }),
    );
    await component.confirm();
    expect(component.state()?.draft?.items).toEqual([]);
    component.ask('finalize');
    await component.confirm();
    expect(api.finalizeCorrection).not.toHaveBeenCalled();
    expect(api.discardCorrection).not.toHaveBeenCalled();
    component.ask('discard');
    api.discardCorrection.mockReturnValue(
      of({
        ...state,
        current: { versionNumber: 1, status: 'Finalized', items: [item] },
        draft: null,
      }),
    );
    await component.confirm();
    expect(api.discardCorrection).toHaveBeenCalledWith('rx1', 'v1');
  });
  it('preserves correction mode when the parent supplies the latest returned state', async () => {
    component.correctionMode.set(true);
    fixture.componentRef.setInput('initial', { ...state, rowVersion: 'v2' });
    await fixture.whenStable();
    expect(component.correctionMode()).toBe(true);
    expect(component.state()?.rowVersion).toBe('v2');
  });
  it('renders all 422 blockers and refreshes a conflicting root before another edit', async () => {
    component.editItem(item);
    api.updateItem.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: { errors: { 'items[0].dose': ['First'], 'items[1].dose': ['Second'] } },
          }),
      ),
    );
    await component.saveItem();
    expect(component.messages()).toEqual(expect.arrayContaining(['First', 'Second']));
    api.updateItem.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    api.details.mockReturnValue(of({ ...state, rowVersion: 'v9' }));
    await component.saveItem();
    expect(component.state()?.rowVersion).toBe('v9');
    expect(component.editing()).toBe(false);
  });
  it('renders historical versions as read only and denies non-doctor editing', async () => {
    component.historical.set({ versionNumber: 1, status: 'Superseded', items: [item] });
    fixture.detectChanges();
    expect(component.editable()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('read only');
    component.historical.set(null);
    actor = 'DrugCatalogManager';
    component.beginAdd();
    expect(component.editing()).toBe(false);
  });
  it('whitelists patient clinical output and never renders internal reasons, IDs or prices', async () => {
    fixture.componentRef.setInput('patientView', {
      prescriptionId: 'rx1',
      doctor: { id: 'doctor-secret', nameAr: 'طبيب', nameEn: 'Doctor' },
      practice: { id: 'practice-secret', nameAr: 'عيادة', nameEn: 'Practice' },
      visitDateUtc: '2026-10-06',
      versionNumber: 2,
      status: 'Voided',
      items: [{ ...item, drugCatalogId: 'catalog-secret', priceEgp: 9876 }],
      reason: 'internal-secret',
    });
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Voided');
    expect(text).toContain('one');
    expect(text).not.toContain('internal-secret');
    expect(text).not.toContain('catalog-secret');
    expect(text).not.toContain('9876');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
