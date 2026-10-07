import { AppHeader } from '../../../shared/components/app-header/app-header';
import { MobileNavigation } from '../../../shared/components/mobile-navigation/mobile-navigation';
import { NavigationItem, NAVIGATION_ICONS } from '../../../layout/navigation/navigation-item';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  HostListener,
} from '@angular/core';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, AppHeader, TranslatePipe, MobileNavigation],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  protected readonly navigationIcons = NAVIGATION_ICONS;
  readonly langService = inject(LanguageService);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  protected readonly isSidebarOpen = signal(false);
  protected readonly isSidebarCollapsed = signal<boolean>(
    typeof localStorage !== 'undefined' &&
      localStorage.getItem('wasla_sidebar_collapsed') === 'true',
  );
  protected readonly user = this.session.user;

  protected readonly navItems = computed<NavigationItem[]>(() => {
    const definitions: (NavigationItem & { permission: string })[] = [
      {
        id: 'drug-catalog-managers',
        labelKey: 'medications.managers',
        route: '/admin/drug-catalog-managers',
        icon: 'users',
        permission: 'DrugCatalogManagers.ViewAll',
      },
      {
        id: 'revenue',
        labelKey: 'sidebar.revenue',
        route: '/admin/revenue',
        icon: 'chart',
        permission: PERMISSIONS.platformRevenueViewAggregates,
      },
      {
        id: 'reservations',
        labelKey: 'reservations.title',
        route: '/admin/reservations',
        icon: 'calendar',
        permission: 'Reservations.ViewAdministrative',
      },
      {
        id: 'doctors',
        labelKey: 'admin.navDoctors',
        route: '/admin/doctors',
        icon: 'stethoscope',
        permission: PERMISSIONS.doctorsViewAll,
      },
      {
        id: 'superadmins',
        labelKey: 'admin.navSuperAdmins',
        route: '/admin/superadmins',
        icon: 'shield',
        permission: PERMISSIONS.superAdminsViewAll,
      },
      {
        id: 'roles',
        labelKey: 'admin.navRoles',
        route: '/admin/roles',
        icon: 'lock',
        permission: PERMISSIONS.rolesView,
      },
      {
        id: 'specializations',
        labelKey: 'admin.navSpecializations',
        route: '/admin/medical-specializations',
        icon: 'heart-pulse',
        permission: PERMISSIONS.specializationsView,
      },
      {
        id: 'requests',
        labelKey: 'admin.navRequests',
        route: '/admin/doctor-specialization-requests',
        icon: 'clipboard-list',
        permission: PERMISSIONS.doctorSpecializationRequestsViewAll,
      },
      {
        id: 'family-requests',
        labelKey: 'family.requests',
        route: '/admin/family-relationship-requests',
        icon: 'users',
        permission: PERMISSIONS.familyRelationshipRequestsViewAll,
      },
    ];
    return definitions.filter((item) => this.session.hasPermission(item.permission));
  });
  protected readonly mobileNavItems = computed(() => {
    const priorities = [
      'doctors',
      'reservations',
      'requests',
      'revenue',
      'superadmins',
      'roles',
      'specializations',
      'family-requests',
      'drug-catalog-managers',
    ];
    return priorities
      .flatMap((id) => this.navItems().filter((item) => item.id === id))
      .slice(0, 4)
      .map((item) => ({ ...item, mobileLabelKey: 'navigation.' + item.id }));
  });
  protected readonly home = computed(() => {
    const user = this.user();
    return user ? this.session.destinationFor(user) : '/login';
  });
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeSidebar();
  }

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }

  protected toggleSidebar(): void {
    this.isSidebarOpen.update((open) => !open);
  }

  protected toggleSidebarCollapse(): void {
    this.isSidebarCollapsed.update((collapsed) => {
      const next = !collapsed;
      try {
        localStorage.setItem('wasla_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }
}
