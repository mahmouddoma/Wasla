import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { DoctorPractice } from '../../core/doctor-practices/doctor-practice.models';
import { DoctorPracticesApi } from '../../core/doctor-practices/doctor-practices-api';
import { DoctorProfileApi } from '../../core/doctor-profile/doctor-profile-api';
import { EgyptLocationOption } from '../../core/doctor-profile/doctor-profile.models';
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
});
