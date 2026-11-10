import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';
import { MedicalRecordsApi } from '../../domains/medical-records';
import { MedicalSharingComponent } from './medical-sharing.component';

describe('MedicalSharingComponent', () => {
  it('keeps private data and actions unavailable without an authorized server scope', async () => {
    const inbox = vi.fn();
    TestBed.configureTestingModule({ imports: [MedicalSharingComponent], providers: [provideRouter([]),
      { provide: AuthSession, useValue: { token: () => null, hasPermission: () => false } },
      { provide: MedicalRecordsApi, useValue: { doctorAccessInbox: inbox } }] });
    const fixture = TestBed.createComponent(MedicalSharingComponent);
    await fixture.whenStable();
    expect(fixture.componentInstance.unavailable()).toBe(true);
    expect(inbox).not.toHaveBeenCalled();
    expect(fixture.componentInstance.requests()).toEqual([]);
  });
});
