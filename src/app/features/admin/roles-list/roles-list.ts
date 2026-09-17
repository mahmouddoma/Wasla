import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { SecurityGovernanceApi } from '../services/security-governance/security-governance-api';
import { SecurityRole } from '../services/security-governance/security-governance.models';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SideDrawer } from '../../../shared/components/side-drawer/side-drawer';
import { RoleDetails } from '../role-details/role-details';

@Component({
  selector: 'app-roles-list',
  imports: [PageHeader, SideDrawer, RoleDetails, TranslatePipe],
  templateUrl: './roles-list.html',
  styleUrls: ['../management-list.css', './roles-list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesList {
  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(SecurityGovernanceApi);
  protected readonly roles = signal<SecurityRole[] | null>(null);
  protected readonly searchText = signal('');
  protected readonly isLoading = signal(true);
  protected readonly apiMessages = signal<string[]>([]);
  protected readonly selectedRole = signal<SecurityRole | null>(null);

  protected readonly filteredRoles = computed(() => {
    const list = this.roles();
    if (!list) return null;
    const query = this.searchText().trim().toLowerCase();
    if (!query) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query) ||
        (r.isSystemRole ? 'system role' : 'role').toLowerCase().includes(query),
    );
  });

  constructor() {
    void this.load();
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchText.set(value);
  }

  protected clearSearch(): void {
    this.searchText.set('');
  }

  protected openRoleDrawer(role: SecurityRole): void {
    this.selectedRole.set(role);
  }

  protected closeRoleDrawer(): void {
    this.selectedRole.set(null);
  }

  protected handleRoleSaved(): void {
    // Role updated successfully
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
