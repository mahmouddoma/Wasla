import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { AuthSession } from '../../../../core/auth/auth-session';
import { ReservationWorkspaceComponent } from './reservation-workspace.component';
import { LanguageService } from '../../../../core/i18n/language.service';
import { metadataFixture } from '../../reservation-test-fixtures';
describe('ReservationWorkspaceComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ReservationWorkspaceComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { actor: 'Patient' }, queryParamMap: convertToParamMap({}) },
          },
        },
        {
          provide: AuthSession,
          useValue: { user: () => ({ userType: 'Patient' }), hasPermission: () => false },
        },
      ],
    }),
  );
  it('shows an administrative list failure instead of empty results and retries the same request', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { data: { actor: 'Admin' }, queryParamMap: convertToParamMap({}) } },
    });
    TestBed.overrideProvider(AuthSession, {
      useValue: { user: () => ({ userType: 'SuperAdmin' }), hasPermission: () => true },
    });
    const fixture = TestBed.createComponent(ReservationWorkspaceComponent);
    const http = TestBed.inject(HttpTestingController);
    const language = TestBed.inject(LanguageService);
    fixture.detectChanges();
    http
      .expectOne((request) => request.url.endsWith('/reservations/metadata'))
      .flush(metadataFixture);
    await Promise.resolve();
    const request = http.expectOne((request) => request.url.endsWith('/admin/reservations'));
    expect(request.request.params.get('pageNumber')).toBe('1');
    expect(request.request.params.get('pageSize')).toBe('20');
    expect(request.request.params.has('view')).toBe(false);
    request.flush(
      { errors: [{ code: 'Common.Unknown', message: 'The request could not be completed.' }] },
      {
        status: 500,
        statusText: 'Internal Server Error',
      },
    );
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('tbody [role="alert"]')?.textContent).toContain(
      language.t('reservations.loadFailed'),
    );
    expect(root.querySelector('tbody')?.textContent).not.toContain(
      language.t('reservations.empty'),
    );
    expect(fixture.componentInstance.store.listFailed()).toBe(true);
    (root.querySelector('tbody button') as HTMLButtonElement).click();
    await Promise.resolve();
    const retry = http.expectOne((request) => request.url.endsWith('/admin/reservations'));
    expect(retry.request.params.toString()).toBe(request.request.params.toString());
    retry.flush({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
    await fixture.whenStable();
    expect(fixture.componentInstance.store.listFailed()).toBe(false);
    expect(root.querySelector('tbody [role="alert"]')).toBeNull();
    expect(root.querySelector('tbody')?.textContent).toContain(language.t('reservations.empty'));
    http.verify();
  });
  it('loads an empty patient list and renders the discovery link', async () => {
    const f = TestBed.createComponent(ReservationWorkspaceComponent);
    const http = TestBed.inject(HttpTestingController);
    f.detectChanges();
    http.expectOne((r) => r.url.endsWith('/reservations/metadata')).flush(metadataFixture);
    await Promise.resolve();
    http.expectOne((r) => r.url.endsWith('/reservations/bookable-patients')).flush([]);
    await Promise.resolve();
    http
      .expectOne((r) => r.url.endsWith('/reservations/mine'))
      .flush({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('a[href="/doctors"]')).toBeTruthy();
    expect(f.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    http.verify();
  });
  it('still loads view-authorized reservations when booking subjects fail to load', async () => {
    const f = TestBed.createComponent(ReservationWorkspaceComponent);
    const http = TestBed.inject(HttpTestingController);
    f.detectChanges();
    http.expectOne((r) => r.url.endsWith('/reservations/metadata')).flush(metadataFixture);
    await Promise.resolve();
    http
      .expectOne((r) => r.url.endsWith('/reservations/bookable-patients'))
      .flush(null, {
        status: 403,
        statusText: 'Forbidden',
      });
    for (let i = 0; i < 5; i++) await Promise.resolve();
    http
      .expectOne((r) => r.url.endsWith('/reservations/mine'))
      .flush({
        items: [],
        totalCount: 0,
        pageNumber: 1,
        pageSize: 20,
      });
    await f.whenStable();
    f.detectChanges();
    expect(f.componentInstance.store.canView()).toBe(true);
    expect(f.componentInstance.store.canCreate()).toBe(false);
    expect(f.nativeElement.querySelector('tbody')).toBeTruthy();
    http.verify();
  });
});
