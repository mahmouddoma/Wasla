import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, convertToParamMap } from '@angular/router';
import { AuthSession } from '../../../../core/auth/auth-session';
import { ReservationWorkspaceComponent } from './reservation-workspace.component';
import { LanguageService } from '../../../../core/i18n/language.service';
import {
  metadataFixture,
  patientFixture,
  reservationFixture,
} from '../../reservation-test-fixtures';
describe('ReservationWorkspaceComponent', () => {
  afterEach(() => localStorage.removeItem('wasla_lang'));
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
      useValue: {
        snapshot: {
          data: { actor: 'SuperAdmin', reservationActor: 'Admin' },
          queryParamMap: convertToParamMap({}),
        },
      },
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
  it('keeps reservation values and mobile field labels translated in both languages', async () => {
    const fixture = TestBed.createComponent(ReservationWorkspaceComponent);
    const http = TestBed.inject(HttpTestingController);
    const language = TestBed.inject(LanguageService);
    fixture.detectChanges();
    http
      .expectOne((request) => request.url.endsWith('/reservations/metadata'))
      .flush(metadataFixture);
    await Promise.resolve();
    http.expectOne((request) => request.url.endsWith('/reservations/bookable-patients')).flush([]);
    await Promise.resolve();
    http
      .expectOne((request) => request.url.endsWith('/reservations/mine'))
      .flush({
        items: [reservationFixture],
        totalCount: 1,
        pageNumber: 1,
        pageSize: 20,
      });
    await fixture.whenStable();

    for (const lang of ['ar', 'en'] as const) {
      language.setLanguage(lang);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const labels = Array.from(root.querySelectorAll('.mobile-cell-label'));
      expect(labels.map((label) => label.textContent?.trim())).toEqual(
        ['reference', 'patient', 'practice', 'appointment', 'status'].map((key) =>
          language.t(`reservations.${key}`),
        ),
      );
      expect(root.querySelector('.td-ref')?.textContent).toContain(reservationFixture.reference);
      expect(root.querySelector('.td-appointment')?.textContent).toContain('17:00');
      expect(root.querySelector('tbody button')?.textContent).toContain(
        language.t('reservations.inspect'),
      );
    }
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
  for (const query of [
    { patientId: 'p1', practiceId: 'clinic', date: '2026-10-07' },
    { practiceId: 'clinic', date: '2026-10-07' },
  ]) {
    it(
      'preserves Reception patient and Home date deep links: ' + Object.keys(query).join(', '),
      async () => {
        TestBed.overrideProvider(ActivatedRoute, {
          useValue: {
            snapshot: { data: { actor: 'Reception' }, queryParamMap: convertToParamMap(query) },
          },
        });
        TestBed.overrideProvider(AuthSession, {
          useValue: { user: () => ({ userType: 'Reception' }), hasPermission: () => true },
        });
        const f = TestBed.createComponent(ReservationWorkspaceComponent),
          http = TestBed.inject(HttpTestingController);
        const tick = async () => {
          for (let i = 0; i < 10; i++) await Promise.resolve();
        };
        f.detectChanges();
        http.expectOne((r) => r.url.endsWith('/reservations/metadata')).flush(metadataFixture);
        await tick();
        http
          .expectOne((r) => r.url.endsWith('/reception/practices'))
          .flush([
            {
              id: 'clinic',
              nameAr: 'Synthetic',
              nameEn: 'Synthetic',
              isActive: true,
              permissionCodes: [
                'PracticeReservations.View',
                'PracticeReservations.Create',
                'Patients.SearchBasic',
              ],
            },
          ]);
        await tick();
        http.expectOne((r) => r.url.endsWith('/filter-options')).flush({ segments: [] });
        await tick();
        const list = http.expectOne((r) => r.url.endsWith('/reservations'));
        expect(list.request.params.get('fromDate')).toBe(list.request.params.get('toDate'));
        list.flush({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
        await tick();
        http
          .expectOne((r) => r.url.endsWith('/available-dates'))
          .flush([{ date: '2026-10-07', isAvailable: true }]);
        await tick();
        if ('patientId' in query) {
          const dates = http.expectOne((r) => r.url.endsWith('/available-dates'));
          expect(dates.request.params.get('patientId')).toBe('p1');
          dates.flush([{ date: '2026-10-07', isAvailable: true }]);
          await tick();
        }
        http
          .expectOne((r) => r.url.endsWith('/available-slots'))
          .flush([{ date: '2026-10-07', time: '17:00' }]);
        await f.whenStable();
        f.detectChanges();
        expect(f.componentInstance.store.date()).toBe('2026-10-07');
        expect(f.componentInstance.store.bookingPatientId()).toBe('patientId' in query ? 'p1' : '');
        expect(f.nativeElement.querySelector('.quick-views')).toBeTruthy();
        expect(f.nativeElement.querySelector('.ambient-glow-mesh')).toBeNull();
        expect(
          f.nativeElement.querySelector('app-reservation-editor input[placeholder]'),
        ).toBeNull();
        http.verify();
      },
    );
  }
  it('retains the Home date after selecting a Reception patient, using fresh availability', async () => {
    const f = TestBed.createComponent(ReservationWorkspaceComponent),
      store = f.componentInstance.store;
    store.actor.set('Reception');
    store.practiceId.set('clinic');
    store.date.set('2026-10-07');
    vi.spyOn(store, 'choosePatient').mockImplementation(async (patientId) => {
      store.bookingPatientId.set(patientId);
      store.date.set('');
      store.editor.set('create');
    });
    const chooseDate = vi.spyOn(store, 'chooseDate').mockResolvedValue(undefined);
    await f.componentInstance.choosePatient('p1');
    expect(chooseDate).toHaveBeenCalledWith('2026-10-07');
  });
  it('keeps a Patient patientId-only link from opening a new booking workflow', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: {
          data: { actor: 'Patient' },
          queryParamMap: convertToParamMap({ patientId: 'p1' }),
        },
      },
    });
    const f = TestBed.createComponent(ReservationWorkspaceComponent),
      http = TestBed.inject(HttpTestingController);
    const tick = async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    };
    f.detectChanges();
    http.expectOne((r) => r.url.endsWith('/reservations/metadata')).flush(metadataFixture);
    await tick();
    http.expectOne((r) => r.url.endsWith('/bookable-patients')).flush([patientFixture]);
    await tick();
    http
      .expectOne((r) => r.url.endsWith('/reservations/mine'))
      .flush({ items: [], totalCount: 0, pageNumber: 1, pageSize: 20 });
    await f.whenStable();
    expect(f.componentInstance.store.editor()).toBeNull();
    http.verify();
  });

  it('renders Book appointment in Today empty state when canCreate is true, and opens create drawer', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: { data: { actor: 'Reception' }, queryParamMap: convertToParamMap({}) },
      },
    });
    TestBed.overrideProvider(AuthSession, {
      useValue: { user: () => ({ userType: 'Reception' }), hasPermission: () => true },
    });
    const f = TestBed.createComponent(ReservationWorkspaceComponent),
      http = TestBed.inject(HttpTestingController),
      language = TestBed.inject(LanguageService);
    const tick = async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    };
    f.detectChanges();
    http.expectOne((r) => r.url.endsWith('/reservations/metadata')).flush(metadataFixture);
    await tick();
    http
      .expectOne((r) => r.url.endsWith('/reception/practices'))
      .flush([
        {
          id: 'clinic',
          nameAr: 'Clinic',
          nameEn: 'Clinic',
          isActive: true,
          permissionCodes: [
            'PracticeReservations.View',
            'PracticeReservations.Create',
            'Patients.SearchBasic',
          ],
        },
      ]);
    await tick();
    http.expectOne((r) => r.url.endsWith('/filter-options')).flush({ segments: [] });
    await tick();
    http
      .expectOne((r) => r.url.endsWith('/reservations'))
      .flush({
        items: [],
        totalCount: 0,
        pageNumber: 1,
        pageSize: 20,
      });
    await f.whenStable();
    f.detectChanges();

    const emptyBox = f.nativeElement.querySelector('.table-empty-box');
    expect(emptyBox).toBeTruthy();
    expect(emptyBox.querySelector('.empty-title')?.textContent?.trim()).toBe(
      language.t('reception.appointments.emptyToday'),
    );
    expect(emptyBox.querySelector('.empty-subtitle')?.textContent?.trim()).toBe(
      language.t('reception.appointments.emptyTodayHelp'),
    );

    const bookBtn = emptyBox.querySelector('.btn-primary') as HTMLButtonElement;
    expect(bookBtn).toBeTruthy();
    expect(bookBtn.textContent?.trim()).toBe(language.t('reception.appointments.book'));

    const openEditorSpy = vi.spyOn(f.componentInstance.store, 'openEditor');
    bookBtn.click();
    expect(openEditorSpy).toHaveBeenCalledWith('create');
  });

  it('renders Reset filters in filtered empty state and clicking it restores Today view', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: { data: { actor: 'Reception' }, queryParamMap: convertToParamMap({}) },
      },
    });
    TestBed.overrideProvider(AuthSession, {
      useValue: { user: () => ({ userType: 'Reception' }), hasPermission: () => true },
    });
    const f = TestBed.createComponent(ReservationWorkspaceComponent),
      http = TestBed.inject(HttpTestingController),
      language = TestBed.inject(LanguageService);
    const tick = async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    };
    f.detectChanges();
    http.expectOne((r) => r.url.endsWith('/reservations/metadata')).flush(metadataFixture);
    await tick();
    http
      .expectOne((r) => r.url.endsWith('/reception/practices'))
      .flush([
        {
          id: 'clinic',
          nameAr: 'Clinic',
          nameEn: 'Clinic',
          isActive: true,
          permissionCodes: ['PracticeReservations.View', 'PracticeReservations.Create'],
        },
      ]);
    await tick();
    http.expectOne((r) => r.url.endsWith('/filter-options')).flush({ segments: [] });
    await tick();
    http
      .expectOne((r) => r.url.endsWith('/reservations'))
      .flush({
        items: [],
        totalCount: 0,
        pageNumber: 1,
        pageSize: 20,
      });
    await f.whenStable();
    f.detectChanges();

    // Now apply a filter
    f.componentInstance.store.query.update((q) => ({ ...q, search: 'NonExistent' }));
    f.detectChanges();

    const emptyBox = f.nativeElement.querySelector('.table-empty-box');
    expect(emptyBox.querySelector('.empty-title')?.textContent?.trim()).toBe(
      language.t('reception.appointments.empty'),
    );
    expect(emptyBox.querySelector('.empty-subtitle')?.textContent?.trim()).toBe(
      language.t('reception.appointments.emptyHelp'),
    );

    const resetBtn = emptyBox.querySelector('.btn-secondary') as HTMLButtonElement;
    expect(resetBtn).toBeTruthy();
    expect(resetBtn.textContent?.trim()).toBe(language.t('reception.appointments.resetFilters'));

    const resetFiltersSpy = vi.spyOn(f.componentInstance, 'resetFilters');
    resetBtn.click();
    expect(resetFiltersSpy).toHaveBeenCalled();
    http
      .expectOne((r) => r.url.endsWith('/reservations'))
      .flush({
        items: [],
        totalCount: 0,
        pageNumber: 1,
        pageSize: 20,
      });
  });

  it('renders choose clinic title and selector guidance when no clinic is selected, without filter/date guidance', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: { data: { actor: 'Reception' }, queryParamMap: convertToParamMap({}) },
      },
    });
    TestBed.overrideProvider(AuthSession, {
      useValue: { user: () => ({ userType: 'Reception' }), hasPermission: () => true },
    });
    const f = TestBed.createComponent(ReservationWorkspaceComponent),
      http = TestBed.inject(HttpTestingController),
      language = TestBed.inject(LanguageService);
    const tick = async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    };
    f.detectChanges();
    http.expectOne((r) => r.url.endsWith('/reservations/metadata')).flush(metadataFixture);
    await tick();
    http
      .expectOne((r) => r.url.endsWith('/reception/practices'))
      .flush([
        {
          id: 'clinic-1',
          nameAr: 'Clinic 1',
          nameEn: 'Clinic 1',
          isActive: true,
          permissionCodes: ['PracticeReservations.View'],
        },
        {
          id: 'clinic-2',
          nameAr: 'Clinic 2',
          nameEn: 'Clinic 2',
          isActive: true,
          permissionCodes: ['PracticeReservations.View'],
        },
      ]);
    await tick();
    await f.whenStable();
    f.detectChanges();

    const emptyBox = f.nativeElement.querySelector('.table-empty-box');
    expect(emptyBox).toBeTruthy();
    expect(emptyBox.querySelector('.empty-title')?.textContent?.trim()).toBe(
      language.t('reception.appointments.chooseClinic'),
    );
    expect(emptyBox.querySelector('.empty-subtitle')?.textContent?.trim()).toBe(
      language.t('reception.appointments.chooseClinicHelp'),
    );
    expect(emptyBox.querySelector('.empty-subtitle')?.textContent).not.toContain(
      language.t('reception.appointments.emptyHelp'),
    );
    expect(emptyBox.querySelector('button')).toBeNull();
  });

  it('renders view unavailable title and permission guidance when View permission is missing, without filter/date guidance', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: { data: { actor: 'Reception' }, queryParamMap: convertToParamMap({}) },
      },
    });
    TestBed.overrideProvider(AuthSession, {
      useValue: { user: () => ({ userType: 'Reception' }), hasPermission: () => false },
    });
    const f = TestBed.createComponent(ReservationWorkspaceComponent),
      http = TestBed.inject(HttpTestingController),
      language = TestBed.inject(LanguageService);
    const tick = async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    };
    f.detectChanges();
    http.expectOne((r) => r.url.endsWith('/reservations/metadata')).flush(metadataFixture);
    await tick();
    http
      .expectOne((r) => r.url.endsWith('/reception/practices'))
      .flush([
        {
          id: 'clinic',
          nameAr: 'Clinic',
          nameEn: 'Clinic',
          isActive: true,
          permissionCodes: ['PracticeReservations.Create'],
        },
      ]);
    await tick();
    await f.whenStable();
    f.detectChanges();

    const emptyBox = f.nativeElement.querySelector('.table-empty-box');
    expect(emptyBox).toBeTruthy();
    expect(emptyBox.querySelector('.empty-title')?.textContent?.trim()).toBe(
      language.t('reception.appointments.viewUnavailable'),
    );
    expect(emptyBox.querySelector('.empty-subtitle')?.textContent?.trim()).toBe(
      language.t('reception.appointments.viewUnavailableHelp'),
    );
    expect(emptyBox.querySelector('.empty-subtitle')?.textContent).not.toContain(
      language.t('reception.appointments.emptyHelp'),
    );
    expect(emptyBox.querySelector('button')).toBeNull();
  });

  it('has valid Arabic and English translations for all empty-state keys', () => {
    const language = TestBed.inject(LanguageService);
    const keys = [
      'reception.appointments.chooseClinic',
      'reception.appointments.chooseClinicHelp',
      'reception.appointments.viewUnavailable',
      'reception.appointments.viewUnavailableHelp',
      'reception.appointments.emptyToday',
      'reception.appointments.emptyTodayHelp',
      'reception.appointments.empty',
      'reception.appointments.emptyHelp',
    ];
    for (const key of keys) {
      language.setLanguage('ar');
      const arVal = language.t(key);
      expect(arVal).not.toBe(key);
      expect(arVal.length).toBeGreaterThan(0);

      language.setLanguage('en');
      const enVal = language.t(key);
      expect(enVal).not.toBe(key);
      expect(enVal.length).toBeGreaterThan(0);
    }
  });
});
