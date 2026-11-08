import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FamilyWorkspaceApi, FamiliesApi } from '../../../domains/families';
import { ToastService } from '../../../core/notifications/toast.service';
import { FamilyIntakeComponent } from './family-intake.component';

describe('FamilyIntakeComponent', () => {
  const api = {
    search: vi.fn(),
    submitCandidate: vi.fn(),
    onboard: vi.fn(),
    invite: vi.fn(),
    revokeInvitation: vi.fn(),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [FamilyIntakeComponent],
      providers: [
        { provide: FamilyWorkspaceApi, useValue: api },
        { provide: FamiliesApi, useValue: {} },
        { provide: ToastService, useValue: toast },
      ],
    });
  });
  it('renders identity search without asking for a patient identifier', async () => {
    const fixture = TestBed.createComponent(FamilyIntakeComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[name=patientId]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[name=nameAr]')).not.toBeNull();
  });
  it('uses only the returned opaque candidate reference and evidence', async () => {
    api.submitCandidate.mockReturnValue(of({ status: 'PendingReview' }));
    const fixture = TestBed.createComponent(FamilyIntakeComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.candidateReference = 'opaque';
    component.files = [new File(['evidence'], 'birth.pdf', { type: 'application/pdf' })];
    component.documentTypes = ['BirthCertificate'];
    await component.submit();
    expect(api.submitCandidate).toHaveBeenCalledWith(
      'opaque',
      'Father',
      expect.objectContaining({ documentTypes: ['BirthCertificate'] }),
      expect.any(String),
    );
    expect(toast.success).toHaveBeenCalledOnce();
  });
  it('retains an idempotency key after an uncertain failure', async () => {
    api.onboard.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    const fixture = TestBed.createComponent(FamilyIntakeComponent);
    fixture.componentRef.setInput('mode', 'onboard');
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.intake = {
      ...component.intake,
      nameAr: 'طفل',
      dateOfBirth: '2020-01-01',
      primaryContactNameAr: 'أب',
      primaryContactPhone: '01012345678',
    };
    component.files = [new File(['proof'], 'birth.pdf', { type: 'application/pdf' })];
    component.documentTypes = ['BirthCertificate'];
    await component.submit();
    await component.submit();
    expect(api.onboard.mock.calls[0][2]).toBe(api.onboard.mock.calls[1][2]);
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('does not send intake without a child or guardian phone', async () => {
    const fixture = TestBed.createComponent(FamilyIntakeComponent);
    fixture.componentRef.setInput('mode', 'onboard');
    fixture.detectChanges();
    fixture.componentInstance.files = [new File(['proof'], 'birth.pdf')];
    fixture.componentInstance.documentTypes = ['BirthCertificate'];
    await fixture.componentInstance.submit();
    expect(api.onboard).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});
