import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthSession } from '../../../../core/auth/auth-session';
import { ToastService } from '../../../../core/notifications/toast.service';
import { DoctorProfileApi, DoctorQualification } from '../../../../domains/doctor-profile';
import { PublicProfileManager } from './public-profile-manager';

describe('PublicProfileManager', () => {
  const qualification: DoctorQualification = {
    id: 'qualification-1',
    nameAr: 'دكتوراه',
    nameEn: null,
    displayOrder: 2,
    rowVersion: 'qualification-version',
  };
  const profile = { doctorId: 'doctor-1', bio: 'Professional bio', rowVersion: 'profile-version' };
  const api = {
    publicProfile: vi.fn(() => of(profile)),
    qualifications: vi.fn(() => of([qualification])),
    updateBio: vi.fn(() => of(profile)),
    addQualification: vi.fn(() => of(qualification)),
    updateQualification: vi.fn(() => of(qualification)),
    deleteQualification: vi.fn(() => of(undefined)),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  let allowed = true;
  beforeEach(() => {
    vi.clearAllMocks();
    allowed = true;
    TestBed.configureTestingModule({
      imports: [PublicProfileManager],
      providers: [
        { provide: DoctorProfileApi, useValue: api },
        { provide: ToastService, useValue: toast },
        { provide: AuthSession, useValue: { hasPermission: () => allowed } },
      ],
    });
  });
  it('loads the profile and renders qualifications', async () => {
    const fixture = TestBed.createComponent(PublicProfileManager);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 10));
    fixture.detectChanges();
    expect(fixture.componentInstance['bioModel']().bio).toBe(profile.bio);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(qualification.nameAr);
    expect(fixture.componentInstance['isLoading']()).toBe(false);
  });
  it('does not load or render the editor without permissions', async () => {
    allowed = false;
    const fixture = TestBed.createComponent(PublicProfileManager);
    await fixture.whenStable();
    expect(api.publicProfile).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
  });
  it('rejects markup in the public bio before calling the API', async () => {
    const fixture = TestBed.createComponent(PublicProfileManager);
    await fixture.whenStable();
    fixture.componentInstance['bioModel'].set({ bio: '<b>bio</b>' });
    await fixture.componentInstance['saveBio'](new Event('submit'));
    expect(api.updateBio).not.toHaveBeenCalled();
    expect(fixture.componentInstance['messages']().length).toBe(1);
  });
  it('saves a trimmed bio with its concurrency token and success feedback', async () => {
    const fixture = TestBed.createComponent(PublicProfileManager);
    await fixture.whenStable();
    fixture.componentInstance['bioModel'].set({ bio: '  Updated bio  ' });
    await fixture.componentInstance['saveBio'](new Event('submit'));
    expect(api.updateBio).toHaveBeenCalledWith('Updated bio', profile.rowVersion);
    expect(toast.success).toHaveBeenCalledOnce();
  });
  it('updates the selected qualification and clears edit state after success', async () => {
    const fixture = TestBed.createComponent(PublicProfileManager);
    await fixture.whenStable();
    const page = fixture.componentInstance;
    page['editQualification'](qualification);
    page['qualificationModel'].set({ nameAr: '  ماجستير  ', nameEn: '', displayOrder: 3 });
    await page['saveQualification'](new Event('submit'));
    expect(api.updateQualification).toHaveBeenCalledWith(qualification.id, {
      nameAr: 'ماجستير',
      nameEn: null,
      displayOrder: 3,
      rowVersion: qualification.rowVersion,
    });
    expect(api.addQualification).not.toHaveBeenCalled();
    expect(page['editingQualificationId']()).toBeNull();
    expect(toast.success).toHaveBeenCalledOnce();
  });
  it('preserves qualifications when deletion is cancelled', async () => {
    const fixture = TestBed.createComponent(PublicProfileManager);
    await fixture.whenStable();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await fixture.componentInstance['deleteQualification'](qualification);
    expect(api.deleteQualification).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
