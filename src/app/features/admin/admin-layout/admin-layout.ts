import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../../../shared/components/language-switcher/language-switcher';
import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterOutlet, LanguageSwitcher, TranslatePipe],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  readonly langService = inject(LanguageService);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  protected readonly isSidebarOpen = signal(false);
  protected readonly user = this.session.user;
  protected readonly canViewDoctors = computed(() =>
    this.session.hasPermission(PERMISSIONS.doctorsViewAll),
  );
  protected readonly canViewSuperAdmins = computed(() =>
    this.session.hasPermission(PERMISSIONS.superAdminsViewAll),
  );
  protected readonly canViewRoles = computed(() =>
    this.session.hasPermission(PERMISSIONS.rolesView),
  );
  protected readonly canViewSpecializations = computed(() =>
    this.session.hasPermission(PERMISSIONS.specializationsView),
  );
  protected readonly canViewSpecializationRequests = computed(() =>
    this.session.hasPermission(PERMISSIONS.doctorSpecializationRequestsViewAll),
  );
  protected readonly canViewFamilyRequests = computed(() =>
    this.session.hasPermission(PERMISSIONS.familyRelationshipRequestsViewAll),
  );
  protected readonly home = computed(() => {
    const user = this.user();
    return user ? this.session.destinationFor(user) : '/login';
  });
  protected readonly userInitial = computed(() => {
    const name = this.user()?.userName?.trim();
    return name ? name.charAt(0).toUpperCase() : 'A';
  });

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }

  protected toggleSidebar(): void {
    this.isSidebarOpen.update((open) => !open);
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  protected isCurrent(path: string): boolean {
    return this.router.url.startsWith(path);
  }
}
