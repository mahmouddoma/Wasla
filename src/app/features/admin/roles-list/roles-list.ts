import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { SecurityGovernanceApi } from '../../../core/security-governance/security-governance-api';
import { SecurityRole } from '../../../core/security-governance/security-governance.models';

@Component({
  selector: 'app-roles-list',
  imports: [RouterLink],
  templateUrl: './roles-list.html',
  styleUrl: './roles-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesList {
  private readonly api = inject(SecurityGovernanceApi);
  protected readonly roles = signal<SecurityRole[] | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly apiMessages = signal<string[]>([]);

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.isLoading.set(true);
    this.apiMessages.set([]);
    try {
      this.roles.set(await firstValueFrom(this.api.roles()));
    } catch (error) {
      const parsed = parseApiErrors(error);
      this.apiMessages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
    } finally {
      this.isLoading.set(false);
    }
  }
}
