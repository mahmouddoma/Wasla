import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../../core/auth/auth-session';
import { AuthApi } from '../../../../core/auth/auth-api';
import { ToastService } from '../../../../core/notifications/toast.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { MedicalCatalogApi } from '../../../../domains/medical-catalog';
import { importFixture } from '../../catalog-test-fixtures';
import { ImportsComponent } from './imports.component';

describe('Medical catalog import review', () => {
  afterEach(() => localStorage.removeItem('wasla_lang'));
  it('uses actual Arabic source names and falls back to the official English name', () => {
    const c = TestBed.createComponent(ImportsComponent).componentInstance;
    const change = {
      recordId: 'change',
      loincCode: 'code',
      nameEn: 'Synthetic reference name',
      disposition: 'New' as const,
      sourceDataJson: JSON.stringify({ nameAr: 'اسم تجريبي' }),
      matchedCatalogId: null,
    };
    TestBed.inject(LanguageService).setLanguage('ar');
    expect(c.changeName(change)).toBe('اسم تجريبي');
    expect(c.changeName({ ...change, sourceDataJson: 'invalid-json' })).toBe(
      'Synthetic reference name',
    );
    TestBed.inject(LanguageService).setLanguage('en');
    expect(c.changeName(change)).toBe('Synthetic reference name');
  });
  const api = {
    imports: vi.fn(),
    batch: vi.fn(),
    changes: vi.fn(),
    preview: vi.fn(),
    apply: vi.fn(),
    discard: vi.fn(),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    api.imports.mockReturnValue(
      of({ items: [importFixture], totalCount: 1, pageNumber: 1, pageSize: 20 }),
    );
    api.batch.mockReturnValue(of(importFixture));
    api.changes.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }));
    TestBed.configureTestingModule({
      imports: [ImportsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: { kind: 'radiology' } } } },
        { provide: MedicalCatalogApi, useValue: api },
        { provide: AuthApi, useValue: {} },
        {
          provide: AuthSession,
          useValue: {
            user: () => ({ userType: 'MedicalCatalogManager' }),
            hasPermission: () => true,
          },
        },
        { provide: ToastService, useValue: toast },
      ],
    });
  });
  it('renders import history and pages staged changes in the drawer', async () => {
    const f = TestBed.createComponent(ImportsComponent);
    await f.whenStable();
    expect(f.componentInstance).toBeTruthy();
    expect(f.nativeElement.textContent).toContain('catalog.csv');
    await f.componentInstance.inspect('batch');
    await f.componentInstance.loadChanges(2);
    expect(api.changes).toHaveBeenLastCalledWith('radiology', 'batch', 2);
  });
  it('previews files without applying them and keeps the same key/files on network retry', async () => {
    const c = TestBed.createComponent(ImportsComponent).componentInstance;
    const file = new File(['synthetic'], 'catalog.csv');
    c.file.set(file);
    c.sourceVersion.set('v1');
    api.preview.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await c.preview();
    await c.preview();
    expect(api.preview.mock.calls[0][3]).toBe(api.preview.mock.calls[1][3]);
    expect(api.apply).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
  it('requires explicit confirmation and the latest batch token before apply', async () => {
    const c = TestBed.createComponent(ImportsComponent).componentInstance;
    c.batch.set(importFixture);
    await c.apply();
    expect(api.apply).not.toHaveBeenCalled();
    c.confirmApply.set(true);
    api.apply.mockReturnValue(
      of({ ...importFixture, status: 'Applied', rowVersion: 'applied-rv' }),
    );
    await c.apply();
    expect(api.apply.mock.calls[0][2]).toEqual({
      rowVersion: 'batch-rv',
      skipPossibleConflicts: false,
    });
    expect(c.batch()?.rowVersion).toBe('applied-rv');
    expect(toast.success).toHaveBeenCalled();
  });
  it('rebases and revokes confirmation on a stale batch', async () => {
    const c = TestBed.createComponent(ImportsComponent).componentInstance;
    c.batch.set(importFixture);
    c.confirmApply.set(true);
    api.apply.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    api.batch.mockReturnValue(of({ ...importFixture, rowVersion: 'fresh' }));
    await c.apply();
    expect(c.confirmApply()).toBe(false);
    expect(c.batch()?.rowVersion).toBe('fresh');
  });
  it('does not discard without a reason or a server capability', async () => {
    const c = TestBed.createComponent(ImportsComponent).componentInstance;
    c.batch.set(importFixture);
    await c.discard();
    c.reason.set('Not needed');
    c.batch.set({ ...importFixture, capabilities: { canApply: false, canDiscard: false } });
    await c.discard();
    expect(api.discard).not.toHaveBeenCalled();
  });
});
