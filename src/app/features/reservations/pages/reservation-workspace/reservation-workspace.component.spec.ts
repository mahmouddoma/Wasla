import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { AuthSession } from '../../../../core/auth/auth-session';
import { ReservationWorkspaceComponent } from './reservation-workspace.component';
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
    http.expectOne((r) => r.url.endsWith('/reservations/bookable-patients')).flush(null, {
      status: 403,
      statusText: 'Forbidden',
    });
    for (let i = 0; i < 5; i++) await Promise.resolve();
    http.expectOne((r) => r.url.endsWith('/reservations/mine')).flush({
      items: [], totalCount: 0, pageNumber: 1, pageSize: 20,
    });
    await f.whenStable();
    f.detectChanges();
    expect(f.componentInstance.store.canView()).toBe(true);
    expect(f.componentInstance.store.canCreate()).toBe(false);
    expect(f.nativeElement.querySelector('tbody')).toBeTruthy();
    http.verify();
  });
});
