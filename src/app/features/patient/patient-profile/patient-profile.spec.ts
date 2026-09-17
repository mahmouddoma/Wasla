import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { ToastService } from '../../../core/notifications/toast.service';
import {
  PatientContact,
  PatientProfile as PatientProfileModel,
} from '../../../domains/patients';
import { PatientsApi } from '../../../domains/patients';
import { PatientProfile } from './patient-profile';

describe('PatientProfile', () => {
  let fixture: ComponentFixture<PatientProfile>;
  let component: PatientProfile;

  const sampleProfile: PatientProfileModel = {
    patientId: 'patient-123',
    nameAr: 'أحمد محمود',
    nameEn: 'Ahmed Mahmoud',
    phoneNumber: '01011122233',
    email: 'ahmed@example.com',
    dateOfBirth: '1995-03-10',
    gender: 'Male',
    hasProfileImage: false,
    rowVersion: 'ver-1',
  };

  const sampleContact: PatientContact = {
    contactId: 'contact-1',
    nameAr: 'محمود أحمد',
    nameEn: 'Mahmoud Ahmed',
    phoneNumber: '01099988877',
    relationshipType: 'Guardian',
    isPrimary: true,
    linkedPatientId: null,
  };

  const api = {
    profile: vi.fn(() => of(sampleProfile)),
    updateProfile: vi.fn(() => of({ ...sampleProfile, rowVersion: 'ver-2' })),
    contacts: vi.fn(() => of([sampleContact])),
    addContact: vi.fn(() => of(sampleContact)),
    updateContact: vi.fn(() => of(sampleContact)),
    deactivateContact: vi.fn(() => of(undefined)),
    profileImage: vi.fn(() => of(new Blob())),
  };

  const session = {
    hasPermission: vi.fn(() => true),
  };

  const toast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    api.profile.mockReturnValue(of(sampleProfile));
    api.updateProfile.mockReturnValue(of({ ...sampleProfile, rowVersion: 'ver-2' }));
    api.contacts.mockReturnValue(of([sampleContact]));
    session.hasPermission.mockReturnValue(true);

    TestBed.configureTestingModule({
      imports: [PatientProfile],
      providers: [
        provideRouter([]),
        { provide: PatientsApi, useValue: api },
        { provide: AuthSession, useValue: session },
        { provide: ToastService, useValue: toast },
      ],
    });
    TestBed.inject(LanguageService).setLanguage('ar');
    fixture = TestBed.createComponent(PatientProfile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem('wasla_lang'));

  it('loads patient profile and contact information on init', async () => {
    expect(component).toBeTruthy();
    expect(api.profile).toHaveBeenCalled();
    expect(api.contacts).toHaveBeenCalled();
    expect(component['profile']()).toEqual(sampleProfile);
    expect(component['profileModel']().nameAr).toBe('أحمد محمود');
    expect(component['loading']()).toBe(false);
  });

  it('updates profile successfully, displays success toast and updates rowVersion', async () => {
    component['profileModel'].set({
      nameAr: 'أحمد محمود معدل',
      nameEn: 'Ahmed Mahmoud Updated',
      phoneNumber: '01011122233',
      email: 'ahmed.updated@example.com',
    });
    fixture.detectChanges();

    await component['saveProfile'](new Event('submit', { cancelable: true }));

    expect(api.updateProfile).toHaveBeenCalledWith({
      nameAr: 'أحمد محمود معدل',
      nameEn: 'Ahmed Mahmoud Updated',
      phoneNumber: '01011122233',
      email: 'ahmed.updated@example.com',
      rowVersion: 'ver-1',
      profileImage: undefined,
    });
    expect(toast.success).toHaveBeenCalled();
    expect(component['profile']()?.rowVersion).toBe('ver-2');
  });

  it('handles 409 concurrency conflict when updating profile and reloads latest data', async () => {
    const conflictError = new HttpErrorResponse({
      status: 409,
      error: { message: 'Concurrency conflict.' },
    });
    api.updateProfile.mockReturnValue(throwError(() => conflictError));

    await component['saveProfile'](new Event('submit', { cancelable: true }));

    expect(toast.error).toHaveBeenCalled();
    expect(api.profile).toHaveBeenCalledTimes(2);
  });

  it('adds and deactivates contact with proper feedback', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component['contactModel'].set({
      nameAr: 'علي حسن',
      nameEn: 'Ali Hassan',
      phoneNumber: '01055544433',
      relationshipType: 'Guardian',
      linkedPatientId: '',
      isPrimary: false,
    });
    fixture.detectChanges();

    await component['saveContact'](new Event('submit', { cancelable: true }));
    expect(api.addContact).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();

    await component['deactivateContact'](sampleContact);
    expect(api.deactivateContact).toHaveBeenCalledWith(sampleContact.contactId);
    expect(toast.success).toHaveBeenCalled();
  });
});
