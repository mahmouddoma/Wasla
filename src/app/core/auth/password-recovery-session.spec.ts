import { TestBed } from '@angular/core/testing';
import { PasswordRecoverySession } from './password-recovery-session';

describe('PasswordRecoverySession', () => {
  let session: PasswordRecoverySession;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({});
    session = TestBed.inject(PasswordRecoverySession);
  });

  it('keeps the reset grant in memory only after a matching OTP challenge', () => {
    const requestId = '1bbac680-bda0-4cb0-b531-7cc1d61e22b6';
    session.begin('doctor@example.com', { requestId, message: null });

    expect(
      session.acceptGrant({
        requestId,
        resetToken: 'opaque-token',
        expiresOnUtc: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).toBe(true);
    expect(session.validGrant()?.requestId).toBe(requestId);
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
  });

  it('rejects a grant issued for a different request', () => {
    session.begin('doctor@example.com', {
      requestId: '1bbac680-bda0-4cb0-b531-7cc1d61e22b6',
      message: null,
    });

    expect(
      session.acceptGrant({
        requestId: '771326e6-1033-4e43-b5b0-484cc2d74ec2',
        resetToken: 'opaque-token',
        expiresOnUtc: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).toBe(false);
    expect(session.validGrant()).toBeNull();
  });
});
