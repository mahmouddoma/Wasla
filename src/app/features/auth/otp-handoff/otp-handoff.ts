import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthApi } from '../../../core/auth/auth-api';

@Component({
  selector: 'app-otp-handoff',
  imports: [RouterLink],
  templateUrl: './otp-handoff.html',
  styleUrl: './otp-handoff.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpHandoff {
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly email = this.readState('email');
  protected readonly requestId = signal(this.readState('requestId'));
  protected readonly apiMessage = signal(this.readState('message'));
  protected readonly apiErrors = signal<string[]>([]);
  protected readonly isResending = signal(false);

  constructor() {
    if (!this.requestId() || !this.email) void this.router.navigate(['/forgot-password']);
  }

  protected async resend(): Promise<void> {
    if (this.isResending() || !this.email) return;
    this.isResending.set(true);
    this.apiErrors.set([]);
    try {
      const response = await firstValueFrom(this.api.requestPasswordReset({ email: this.email }));
      this.requestId.set(response.requestId);
      this.apiMessage.set(response.message ?? '');
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.apiErrors.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
    } finally {
      this.isResending.set(false);
    }
  }

  private readState(key: string): string {
    const value: unknown = history.state[key];
    return typeof value === 'string' ? value : '';
  }
}
