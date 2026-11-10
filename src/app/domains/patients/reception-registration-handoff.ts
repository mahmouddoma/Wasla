import { Injectable, inject } from '@angular/core';
import { AuthSession } from '../../core/auth/auth-session';
import { PatientSearchItem } from './patient.models';

/** Ephemeral same-session continuation; never store patient data in URLs or browser storage. */
@Injectable({ providedIn: 'root' })
export class ReceptionRegistrationHandoff {
  private readonly session = inject(AuthSession);
  private pending: { practiceId: string; patient: PatientSearchItem; token: string | null } | null =
    null;
  stage(practiceId: string, patient: PatientSearchItem): void {
    this.pending = { practiceId, patient, token: this.session.token() };
  }
  consume(practiceId: string): PatientSearchItem | null {
    const pending = this.pending;
    this.pending = null;
    return pending &&
      pending.practiceId === practiceId &&
      pending.token !== null &&
      pending.token === this.session.token()
      ? pending.patient
      : null;
  }
}
