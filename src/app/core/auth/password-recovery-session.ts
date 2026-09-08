import { Injectable, signal } from '@angular/core';
import { PasswordRecoveryOtpResponse, PasswordRecoveryRequestResponse } from './auth.models';

interface RecoveryChallenge {
  email: string;
  requestId: string;
  message: string;
}

interface RecoveryGrant {
  requestId: string;
  resetToken: string;
  expiresOnUtc: string;
}

@Injectable({ providedIn: 'root' })
export class PasswordRecoverySession {
  private readonly challengeState = signal<RecoveryChallenge | null>(null);
  private readonly grantState = signal<RecoveryGrant | null>(null);

  readonly challenge = this.challengeState.asReadonly();
  readonly grant = this.grantState.asReadonly();

  begin(email: string, response: PasswordRecoveryRequestResponse): void {
    this.grantState.set(null);
    this.challengeState.set({
      email,
      requestId: response.requestId,
      message: response.message ?? '',
    });
  }

  acceptGrant(response: PasswordRecoveryOtpResponse): boolean {
    const challenge = this.challengeState();
    if (
      !challenge ||
      challenge.requestId !== response.requestId ||
      !response.resetToken ||
      !this.isFutureDate(response.expiresOnUtc)
    ) {
      return false;
    }
    this.grantState.set({
      requestId: response.requestId,
      resetToken: response.resetToken,
      expiresOnUtc: response.expiresOnUtc,
    });
    return true;
  }

  validGrant(): RecoveryGrant | null {
    const grant = this.grantState();
    return grant && this.isFutureDate(grant.expiresOnUtc) ? grant : null;
  }

  clear(): void {
    this.challengeState.set(null);
    this.grantState.set(null);
  }

  private isFutureDate(value: string): boolean {
    const expiry = Date.parse(value);
    return Number.isFinite(expiry) && expiry > Date.now();
  }
}
