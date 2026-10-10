import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../../../core/notifications/toast.service';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { DoctorPractice } from '../../../../domains/doctor-practices';
import { DoctorPracticesApi } from '../../../../domains/doctor-practices';
import { DoctorProfileApi } from '../../../../domains/doctor-profile';
import { EgyptLocationOption } from '../../../../domains/doctor-profile';
import { PracticeEditor } from './practice-editor';

describe('PracticeEditor', () => {
  it('restores saved location selections after lookup options arrive', async () => {
    const governorate = { id: 1, nameAr: 'القاهرة', nameEn: 'Cairo' };
    const city = { id: 1028, nameAr: 'قسم مصرالجديدة', nameEn: 'Misr al-Gadida' };
    const area = { id: 10280003, nameAr: 'المنتزة', nameEn: 'Al-Montazah' };
    const practice: DoctorPractice = {
      id: 'practice-1',
      nameAr: 'عيادة تجريبية',
      nameEn: 'Test Clinic',
      location: {
        governorate,
        city,
        area,
        detailedAddress: '٢٤ شارع الخليفة المأمون',
        latitude: 30.0876,
        longitude: 31.309,
      },
      isActive: false,
      hasLogo: false,
      rowVersion: 'AQID',
    };
    const governorates = new Subject<EgyptLocationOption[]>();
    const locationApi = {
      governorates: () => governorates,
      cities: vi.fn(() => of([city])),
      areas: vi.fn(() => of([area])),
    };
    TestBed.configureTestingModule({
      imports: [PracticeEditor],
      providers: [
        { provide: DoctorPracticesApi, useValue: {} },
        { provide: DoctorProfileApi, useValue: locationApi },
      ],
    });
    const fixture = TestBed.createComponent(PracticeEditor);
    fixture.componentRef.setInput('practice', practice);
    await fixture.whenStable();
    governorates.next([governorate]);
    await vi.waitFor(() => expect(locationApi.areas).toHaveBeenCalledWith(1028));
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement;
    expect(fixture.componentInstance).toBeTruthy();
    expect(locationApi.cities).toHaveBeenCalledWith(1);
    expect(locationApi.areas).toHaveBeenCalledWith(1028);
    expect(Array.from(element.querySelectorAll('select'), (select) => select.value)).toEqual([
      '1',
      '1028',
      '10280003',
    ]);
    expect(element.querySelector('input')?.value).toBe(practice.nameAr);
  });

  describe('saving', () => {
    const practice: DoctorPractice = {
      id: 'p1',
      nameAr: 'Clinic',
      nameEn: 'Clinic',
      isActive: false,
      hasLogo: false,
      rowVersion: 'v1',
      location: {
        governorate: { id: 1, nameAr: 'Cairo', nameEn: 'Cairo' },
        city: { id: 2, nameAr: 'City', nameEn: 'City' },
        area: { id: 3, nameAr: 'Area', nameEn: 'Area' },
        detailedAddress: 'Address',
        latitude: 30,
        longitude: 31,
      },
    };
    const api = { create: vi.fn(), update: vi.fn(), details: vi.fn() };
    const toast = { success: vi.fn(), error: vi.fn() };
    async function start(edit = true) {
      vi.resetAllMocks();
      TestBed.configureTestingModule({
        imports: [PracticeEditor],
        providers: [
          { provide: DoctorPracticesApi, useValue: api },
          { provide: ToastService, useValue: toast },
          {
            provide: DoctorProfileApi,
            useValue: {
              governorates: () => of([practice.location.governorate]),
              cities: () => of([practice.location.city]),
              areas: () => of([practice.location.area]),
            },
          },
        ],
      });
      TestBed.inject(LanguageService).setLanguage('en');
      const fixture = TestBed.createComponent(PracticeEditor);
      if (edit) fixture.componentRef.setInput('practice', practice);
      await fixture.whenStable();
      return fixture;
    }
    afterEach(() => {
      TestBed.resetTestingModule();
      localStorage.removeItem('wasla_lang');
    });
    it('blocks invalid creation without sending a request', async () => {
      const fixture = await start(false);
      await fixture.componentInstance['save'](new Event('submit'));
      expect(api.create).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(fixture.componentInstance['editorForm']().invalid()).toBe(true);
    });
    it('locks controls and prevents duplicate saves, then emits the updated practice', async () => {
      const fixture = await start();
      const response = new Subject<DoctorPractice>();
      api.update.mockReturnValue(response);
      const emitted = vi.fn();
      fixture.componentInstance.saved.subscribe(emitted);
      const saving = fixture.componentInstance['save'](new Event('submit'));
      await vi.waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
      await fixture.componentInstance['save'](new Event('submit'));
      expect(api.update).toHaveBeenCalledTimes(1);
      response.next({ ...practice, rowVersion: 'v2' });
      await saving;
      expect(emitted).toHaveBeenCalledWith(expect.objectContaining({ rowVersion: 'v2' }));
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance['isSubmitting']()).toBe(false);
    });
    it('preserves input after a failed save and shows an error toast', async () => {
      const fixture = await start();
      fixture.componentInstance['model'].update((v) => ({ ...v, nameAr: 'Changed clinic' }));
      api.update.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
      await fixture.componentInstance['save'](new Event('submit'));
      expect(fixture.componentInstance['model']().nameAr).toBe('Changed clinic');
      expect(toast.error).toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(fixture.componentInstance['isSubmitting']()).toBe(false);
    });
    it('uses the refreshed row version when retrying after a conflict', async () => {
      const fixture = await start();
      api.update
        .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409 })))
        .mockReturnValueOnce(of({ ...practice, rowVersion: 'v3' }));
      api.details.mockReturnValue(of({ ...practice, rowVersion: 'v2' }));
      await fixture.componentInstance['save'](new Event('submit'));
      await fixture.componentInstance['save'](new Event('submit'));
      expect(api.update.mock.calls[1][1].rowVersion).toBe('v2');
      expect(toast.error).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledTimes(1);
    });

    it('populates coordinates when useCurrentLocation succeeds', async () => {
      const fixture = await start();
      const mockGeolocation = {
        getCurrentPosition: vi.fn((success) =>
          success({ coords: { latitude: 30.0444, longitude: 31.2357 } }),
        ),
      };
      vi.stubGlobal('navigator', { ...navigator, geolocation: mockGeolocation });
      fixture.componentInstance['useCurrentLocation']();
      expect(fixture.componentInstance['model']().latitude).toBe(30.0444);
      expect(fixture.componentInstance['model']().longitude).toBe(31.2357);
      expect(fixture.componentInstance['hasValidCoordinates']()).toBe(true);
      expect(toast.success).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });
  });
});
