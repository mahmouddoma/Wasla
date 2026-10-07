import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { AuthApi } from '../../../../core/auth/auth-api';
import { ToastService } from '../../../../core/notifications/toast.service';
import { MedicalCatalogApi } from '../../../../domains/medical-catalog';
import { catalogFixture, catalogRequestFixture } from '../../catalog-test-fixtures';
import { CatalogRequestsComponent } from './requests.component';

describe.each(['Doctor', 'MedicalCatalogManager'])('%s catalog request workflow', (actor) => {
  const api = {
    requests: vi.fn(),
    request: vi.fn(),
    createRequest: vi.fn(),
    updateRequest: vi.fn(),
    review: vi.fn(),
    list: vi.fn(),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    api.requests.mockReturnValue(
      of({ items: [catalogRequestFixture], totalCount: 1, pageNumber: 1, pageSize: 20 }),
    );
    api.request.mockReturnValue(of(catalogRequestFixture));
    api.list.mockReturnValue(
      of({ items: [catalogFixture], totalCount: 1, pageNumber: 1, pageSize: 20 }),
    );
    api.review.mockReturnValue(of({ ...catalogRequestFixture, rowVersion: 'new-review-rv' }));
    api.createRequest.mockReturnValue(of(catalogRequestFixture));
    api.updateRequest.mockReturnValue(
      of({ ...catalogRequestFixture, rowVersion: 'new-review-rv' }),
    );
    TestBed.configureTestingModule({
      imports: [CatalogRequestsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: { kind: 'lab', actor } } } },
        { provide: MedicalCatalogApi, useValue: api },
        { provide: AuthApi, useValue: {} },
        {
          provide: AuthSession,
          useValue: { user: () => ({ userType: actor }), hasPermission: () => true },
        },
        { provide: ToastService, useValue: toast },
      ],
    });
  });
  it('renders and opens the actor-specific details without clinical identifiers', async () => {
    const f = TestBed.createComponent(CatalogRequestsComponent);
    await f.whenStable();
    expect(f.componentInstance).toBeTruthy();
    await f.componentInstance.inspect('catalog-request');
    expect(api.request).toHaveBeenCalledWith('lab', 'catalog-request', actor === 'Doctor');
    f.detectChanges();
    expect(f.nativeElement.textContent).not.toContain('requestedByDoctorId');
  });
  it('keeps create/edit limited to the requesting doctor', async () => {
    const c = TestBed.createComponent(CatalogRequestsComponent).componentInstance;
    c.create();
    c.name.set('New test');
    await c.save();
    if (actor === 'Doctor') {
      expect(api.createRequest).toHaveBeenCalled();
      expect(api.createRequest.mock.calls[0][1]).toEqual({
        testName: 'New test',
        specimen: null,
        catalogClarificationNote: null,
      });
      expect(toast.success).toHaveBeenCalled();
    } else expect(api.createRequest).not.toHaveBeenCalled();
  });
  it('uses Review permission plus capabilities, and links an active canonical test', async () => {
    const c = TestBed.createComponent(CatalogRequestsComponent).componentInstance;
    await c.inspect('catalog-request');
    c.prepare('approve');
    await c.loadTargets();
    c.targetId.set('catalog');
    await c.review();
    if (actor === 'MedicalCatalogManager') {
      expect(api.review).toHaveBeenCalled();
      expect(api.review.mock.calls[0][3]).toEqual({
        rowVersion: 'review-rv',
        reason: null,
        canonicalCatalogId: 'catalog',
      });
      expect(api.review.mock.calls[0][4]).toBeTruthy();
      expect(c.detail()?.rowVersion).toBe('new-review-rv');
    } else expect(api.review).not.toHaveBeenCalled();
  });
});
