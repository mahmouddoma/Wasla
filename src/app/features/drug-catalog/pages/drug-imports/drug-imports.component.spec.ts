import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../../core/auth/auth-session';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { DrugImportsApi } from '../../services/drug-imports-api';
import { DrugImportBatch } from '../../models/drug-import.models';
import { DrugImportsComponent } from './drug-imports.component';
const batch: DrugImportBatch = {
  batchId: 'b1',
  status: 'Staged',
  fileSha256: 'sha',
  counts: { New: 1 },
  createdOnUtc: '2026-10-06',
  rowVersion: 'v1',
};
describe('Medication import review', () => {
  let fixture: ComponentFixture<DrugImportsComponent>, component: DrugImportsComponent;
  const api = {
      list: vi.fn(),
      preview: vi.fn(),
      details: vi.fn(),
      changes: vi.fn(),
      apply: vi.fn(),
    },
    toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(async () => {
    vi.resetAllMocks();
    api.list.mockReturnValue(of({ items: [batch], totalCount: 1, pageNumber: 1, pageSize: 20 }));
    api.details.mockReturnValue(of(batch));
    api.preview.mockReturnValue(of(batch));
    api.changes.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }));
    TestBed.configureTestingModule({
      imports: [DrugImportsComponent],
      providers: [
        provideRouter([]),
        { provide: DrugImportsApi, useValue: api },
        { provide: ToastService, useValue: toast },
        {
          provide: AuthSession,
          useValue: { user: () => ({ userType: 'DrugCatalogManager' }), hasPermission: () => true },
        },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('en');
    fixture = TestBed.createComponent(DrugImportsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });
  afterEach(() => localStorage.removeItem('wasla_lang'));
  it('creates a preview without applying and opens the shared drawer', async () => {
    expect(component).toBeTruthy();
    component.file.set(new File(['[]'], 'drugs.json'));
    await component.preview();
    await fixture.whenStable();
    expect(api.apply).not.toHaveBeenCalled();
    expect(component.confirmation()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(toast.success).toHaveBeenCalledWith('imports.previewSaved');
  });
  it('rejects invalid files and renders an illustrated empty state', () => {
    component.chooseFile({ target: { files: [new File(['x'], 'file.csv')] } } as unknown as Event);
    expect(component.file()).toBeNull();
    expect(component.messages()).toEqual(['imports.invalidFile']);
    component.page.set({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.state-empty-illustration')).toBeTruthy();
  });
  it('requires confirmation, preserves retry key, and blocks applying an applied batch', async () => {
    await component.inspect('b1');
    await component.apply();
    expect(api.apply).not.toHaveBeenCalled();
    component.confirmation.set(true);
    api.apply.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    await component.apply();
    const key = api.apply.mock.calls[0][1];
    api.apply.mockReturnValue(of({ ...batch, status: 'Applied' }));
    api.details.mockReturnValue(of({ ...batch, status: 'Applied' }));
    await component.apply();
    expect(api.apply.mock.calls[1][1]).toBe(key);
    component.confirmation.set(true);
    await component.apply();
    expect(api.apply).toHaveBeenCalledTimes(2);
  });
  it('refreshes a conflicting batch before another explicit decision', async () => {
    await component.inspect('b1');
    component.confirmation.set(true);
    api.apply.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    api.details.mockReturnValue(of({ ...batch, rowVersion: 'v9', status: 'Applied' }));
    await component.apply();
    expect(component.detail()?.rowVersion).toBe('v9');
    expect(component.confirmation()).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });
});
