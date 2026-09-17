import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SuperAdminForm, SuperAdminFormSubmission } from './superadmin-form';
import { LanguageService } from '../../../core/i18n/language.service';
import { SuperAdminRecord } from '../services/superadmins';

describe('SuperAdminForm', () => {
  let fixture: ComponentFixture<SuperAdminForm>;
  let component: SuperAdminForm;

  const mockRecord: SuperAdminRecord = {
    superAdminId: 'sa-1',
    applicationUserId: 'app-u-1',
    userName: 'superadmin1',
    email: 'admin@example.com',
    phoneNumber: '01012345678',
    nameAr: 'مشرف أول',
    nameEn: 'Super Admin One',
    isRootSuperAdmin: false,
    isActive: true,
    isDeleted: false,
    createdOnUtc: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperAdminForm],
      providers: [LanguageService],
    }).compileComponents();

    fixture = TestBed.createComponent(SuperAdminForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create form component in create mode by default', () => {
    expect(component).toBeTruthy();
    expect(component.mode()).toBe('create');
  });

  it('should populate form when record is provided in update mode', () => {
    fixture.componentRef.setInput('mode', 'update');
    fixture.componentRef.setInput('record', mockRecord);
    fixture.detectChanges();

    const model = (component as unknown as { model: () => { userName: string } }).model();
    expect(model.userName).toBe('superadmin1');
  });

  it('should emit cancelled event when cancel is clicked', () => {
    let cancelledCalled = false;
    component.cancelled.subscribe(() => (cancelledCalled = true));

    component.cancelled.emit();

    expect(cancelledCalled).toBe(true);
  });

  it('should emit saved event on valid create form submission', async () => {
    let emittedSubmission: SuperAdminFormSubmission | undefined;
    component.saved.subscribe((s) => (emittedSubmission = s));

    (component as unknown as { model: { set: (v: unknown) => void } }).model.set({
      userName: 'newadmin',
      email: 'newadmin@example.com',
      phoneNumber: '01099998888',
      nameAr: 'مشرف جديد',
      nameEn: 'New Admin',
      initialPassword: 'Password123!',
      confirmPassword: 'Password123!',
    });
    fixture.detectChanges();

    const event = new Event('submit', { cancelable: true });
    await (component as unknown as { onSubmit: (e: Event) => Promise<void> }).onSubmit(event);

    expect(emittedSubmission).toBeDefined();
    if (emittedSubmission) {
      expect(emittedSubmission.mode).toBe('create');
    }
  });
});
