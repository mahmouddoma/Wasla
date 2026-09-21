import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../language-switcher/language-switcher';

export interface PortalNavItem {
  id: string;
  labelKey: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-portal-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LanguageSwitcher, TranslatePipe],
  templateUrl: './portal-layout.html',
  styleUrl: './portal-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalLayout {
  readonly langService = inject(LanguageService);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  protected readonly isSidebarOpen = signal(false);
  protected readonly isSidebarCollapsed = signal<boolean>(
    typeof localStorage !== 'undefined' &&
      localStorage.getItem('wasla_portal_sidebar_collapsed') === 'true',
  );

  protected readonly user = this.session.user;

  protected readonly home = computed(() => {
    const user = this.user();
    return user ? this.session.destinationFor(user) : '/login';
  });

  protected readonly userInitial = computed(() => {
    const name = this.user()?.userName?.trim();
    return name ? name.charAt(0).toUpperCase() : '';
  });

  protected readonly userRole = computed(() => {
    const user = this.user();
    return user?.roles?.length
      ? user.roles.join(', ')
      : (user?.userType ?? '');
  });

  protected readonly roleNavItems = computed<PortalNavItem[]>(() => {
    const userType = this.user()?.userType?.toLowerCase();

    if (userType === 'doctor') {
      return [
        {
          id: 'workspace',
          labelKey: 'sidebar.workspace',
          route: '/workspace/doctor',
          icon: 'home',
        },
        {
          id: 'reservations',
          labelKey: 'sidebar.reservations',
          route: '/doctor/reservations',
          icon: 'calendar',
        },
        {
          id: 'queue',
          labelKey: 'sidebar.queue',
          route: '/doctor/queue',
          icon: 'clock',
        },
        {
          id: 'profile',
          labelKey: 'sidebar.doctorProfile',
          route: '/doctor/profile',
          icon: 'stethoscope',
        },
        {
          id: 'practices',
          labelKey: 'sidebar.practices',
          route: '/doctor/practices',
          icon: 'building',
        },
        {
          id: 'receptions',
          labelKey: 'sidebar.receptions',
          route: '/doctor/receptions',
          icon: 'users',
        },
      ];
    }

    if (userType === 'reception') {
      return [
        {
          id: 'workspace',
          labelKey: 'sidebar.workspace',
          route: '/workspace/reception',
          icon: 'home',
        },
        {
          id: 'reservations',
          labelKey: 'sidebar.reservations',
          route: '/reception/reservations',
          icon: 'calendar',
        },
        {
          id: 'queue',
          labelKey: 'sidebar.queue',
          route: '/reception/queue',
          icon: 'clock',
        },
        {
          id: 'patients',
          labelKey: 'sidebar.patients',
          route: '/reception/patients',
          icon: 'user-check',
        },
        {
          id: 'family-requests',
          labelKey: 'sidebar.familyRequests',
          route: '/reception/family-requests',
          icon: 'clipboard-list',
        },
      ];
    }

    // Default: Patient
    return [
      {
        id: 'workspace',
        labelKey: 'sidebar.workspace',
        route: '/workspace/patient',
        icon: 'home',
      },
      {
        id: 'reservations',
        labelKey: 'sidebar.reservations',
        route: '/patient/reservations',
        icon: 'calendar',
      },
      {
        id: 'tickets',
        labelKey: 'sidebar.tickets',
        route: '/patient/tickets',
        icon: 'ticket',
      },
      {
        id: 'profile',
        labelKey: 'sidebar.healthProfile',
        route: '/patient/profile',
        icon: 'heart-pulse',
      },
      {
        id: 'family',
        labelKey: 'sidebar.family',
        route: '/patient/family',
        icon: 'users',
      },
    ];
  });

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
        localStorage.setItem('wasla_portal_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }
}
