import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSession } from '../../../../core/auth/auth-session';
import { AuthApi } from '../../../../core/auth/auth-api';
import { LanguageService } from '../../../../core/i18n/language.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { MedicalCatalogApi } from '../../../../domains/medical-catalog';
import { catalogFixture } from '../../catalog-test-fixtures';
import { CatalogComponent } from './catalog.component';

describe('Medical catalog directory', () => {
  it('shows validation inside the open drawer', async () => {
    const f = TestBed.createComponent(CatalogComponent);
    await f.componentInstance.inspect('catalog');
    f.componentInstance.edit();
    f.componentInstance.field('displayNameAr', '');
    f.componentInstance.field('displayNameEn', '');
    await f.componentInstance.save();
    f.detectChanges();
    expect(f.nativeElement.querySelector('app-side-drawer [role=alert]').textContent).toContain(
      'Enter the test name first',
    );
    expect(api.update).not.toHaveBeenCalled();
  });
  const api = {
    list: vi.fn(),
    details: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    action: vi.fn(),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  let permission = true;
  afterEach(() => localStorage.removeItem('wasla_lang'));
  beforeEach(() => {
    vi.resetAllMocks();
    permission = true;
    api.list.mockReturnValue(
      of({ items: [catalogFixture], totalCount: 1, pageNumber: 1, pageSize: 20 }),
    );
    api.details.mockReturnValue(of(catalogFixture));
    TestBed.configureTestingModule({
      imports: [CatalogComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: { kind: 'lab' } } } },
        { provide: MedicalCatalogApi, useValue: api },
        { provide: AuthApi, useValue: { currentUser: vi.fn() } },
        {
          provide: AuthSession,
          useValue: {
            user: () => ({ userType: 'MedicalCatalogManager' }),
            hasPermission: () => permission,
          },
        },
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('en');
  });
  it('renders the catalog and inspects the selected row in a shared drawer', async () => {
    const f = TestBed.createComponent(CatalogComponent);
    await f.whenStable();
    expect(f.componentInstance).toBeTruthy();
    expect(f.nativeElement.textContent).toContain('Synthetic test');
    f.nativeElement.querySelector('tbody button').click();
    await f.whenStable();
    expect(api.details).toHaveBeenCalledWith('lab', 'catalog');
    expect(f.nativeElement.querySelector('app-side-drawer').textContent).toContain('Official name');
  });
  it('keeps source fields outside the presentation update contract', async () => {
    const f = TestBed.createComponent(CatalogComponent);
    const c = f.componentInstance;
    await c.inspect('catalog');
    c.edit();
    c.field('displayNameAr', 'اسم جديد');
    api.update.mockReturnValue(of({ ...catalogFixture, rowVersion: 'new-rv' }));
    await c.save();
    expect(api.update).toHaveBeenCalledWith('lab', 'catalog', {
      data: { ...catalogFixture.presentation, displayNameAr: 'اسم جديد' },
      rowVersion: 'catalog-rv',
    });
    expect(c.detail()?.rowVersion).toBe('new-rv');
    expect(toast.success).toHaveBeenCalled();
  });
  it('retains a merge key for uncertain retries and rebases after conflict', async () => {
    const c = TestBed.createComponent(CatalogComponent).componentInstance;
    await c.inspect('catalog');
    api.list.mockReturnValue(
      of({
        items: [{ ...catalogFixture, catalogId: 'target' }],
        pageNumber: 1,
        pageSize: 20,
        totalCount: 1,
      }),
    );
    c.prepare('merge');
    await c.loadTargets();
    c.targets.set({
      items: [{ ...catalogFixture, catalogId: 'target' }],
      pageNumber: 1,
      pageSize: 20,
      totalCount: 1,
    });
    c.targetId.set('target');
    c.reason.set('Duplicate test');
    api.action.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    await c.execute();
    await c.execute();
    expect(api.action.mock.calls[0][4]).toBe(api.action.mock.calls[1][4]);
    api.action.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    api.details.mockReturnValue(of({ ...catalogFixture, rowVersion: 'fresh' }));
    await c.execute();
    expect(c.detail()?.rowVersion).toBe('fresh');
    expect(c.action()).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });
  it('blocks saves when a capability or permission is absent', async () => {
    const c = TestBed.createComponent(CatalogComponent).componentInstance;
    c.detail.set({
      ...catalogFixture,
      capabilities: { ...catalogFixture.capabilities, canEdit: false },
    });
    await c.save();
    permission = false;
    c.create();
    await c.save();
    expect(api.create).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
  });
  it('shows illustrated empty and retryable error states', async () => {
    api.list.mockReturnValue(of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 }));
    const f = TestBed.createComponent(CatalogComponent);
    await f.whenStable();
    expect(f.nativeElement.querySelector('.state-empty-illustration')).toBeTruthy();
    api.list.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await f.componentInstance.load();
    f.detectChanges();
    expect(f.componentInstance.failed()).toBe(true);
    expect(f.nativeElement.textContent).toContain('Could not load');
  });
});
