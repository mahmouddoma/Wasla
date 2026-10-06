import { PERMISSIONS } from '../../../core/auth/permissions';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  HostListener,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { ReceptionPracticeContext } from '../../../domains/reception-practices';

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
  protected readonly practiceContext = inject(ReceptionPracticeContext);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      if (this.session.user()?.userType.toLowerCase() === 'reception') {
        void this.practiceContext.ensureLoaded();
      }
    });
  }

  protected selectPractice(event: Event): void {
    this.practiceContext.select((event.currentTarget as HTMLSelectElement).value);
  }

  protected readonly isSidebarOpen = signal(false);
  protected readonly isSidebarCollapsed = signal<boolean>(
    typeof localStorage !== 'undefined' &&
      localStorage.getItem('wasla_portal_sidebar_collapsed') === 'true',
  );

  protected readonly user = this.session.user;
  protected readonly isReception = computed(() => this.user()?.userType === 'Reception');
  protected readonly mobileNavItems = computed(() =>
    this.isReception()
      ? this.roleNavItems().filter((item) =>
          ['workspace', 'reservations', 'queue', 'patients'].includes(item.id),
        )
      : [],
  );
  protected readonly isUserMenuOpen = signal(false);
  protected readonly isIdCopied = signal(false);

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
    return user?.roles?.length ? user.roles.join(', ') : (user?.userType ?? '');
  });

  protected readonly roleNavItems = computed<PortalNavItem[]>(() => {
    const userType = this.user()?.userType?.toLowerCase();

    if (userType === 'doctor') {
      return [
        ...(this.session.hasPermission(PERMISSIONS.medicalEncountersViewOwn)
          ? [
              {
                id: 'encounters',
                labelKey: 'encounters.title',
                route: '/doctor/encounters',
                icon: 'stethoscope',
              },
            ]
          : []),
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
        { id: 'finance', labelKey: 'sidebar.finance', route: '/doctor/finance', icon: 'receipt' },
        { id: 'revenue', labelKey: 'sidebar.revenue', route: '/doctor/revenue', icon: 'chart' },
      ];
    }

    if (userType === 'reception') {
      const items: PortalNavItem[] = [
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
        {
          id: 'finance',
          labelKey: 'sidebar.finance',
          route: '/reception/finance',
          icon: 'receipt',
        },
      ];
      return items.filter((item) => {
        switch (item.id) {
          case 'reservations':
            return this.practiceContext.hasAnyPracticeWithAnyPermission([
              PERMISSIONS.practiceReservationsView,
              PERMISSIONS.practiceReservationsCreate,
            ]);
          case 'queue':
            return this.practiceContext.hasAnyPracticeWithPermission(
              PERMISSIONS.practiceTicketsView,
            );
          case 'finance':
            return this.practiceContext.hasAnyPracticeWithPermission(
              PERMISSIONS.practicePaymentsView,
            );
          case 'patients':
            return (
              this.session.hasPermission(PERMISSIONS.patientsSearchBasic) ||
              this.session.hasPermission(PERMISSIONS.patientsRegister)
            );
          default:
            return true;
        }
      });
    }

    // Default: Patient
    return [
      ...(this.session.hasPermission(PERMISSIONS.medicalEncountersViewOwnCompleted)
        ? [
            {
              id: 'encounters',
              labelKey: 'encounters.title',
              route: '/patient/encounters',
              icon: 'stethoscope',
            },
          ]
        : []),
      ...(this.session.hasPermission(PERMISSIONS.followUpEligibilityViewOwn)
        ? [
            {
              id: 'follow-ups',
              labelKey: 'followUps.title',
              route: '/patient/follow-ups',
              icon: 'calendar',
            },
          ]
        : []),
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
        id: 'find-doctor',
        labelKey: 'routes.findDoctor',
        route: '/doctors',
        icon: 'stethoscope',
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
      { id: 'finance', labelKey: 'sidebar.finance', route: '/patient/finance', icon: 'receipt' },
    ];
  });

  protected toggleUserMenu(event?: Event): void {
    if (event) event.stopPropagation();
    this.isUserMenuOpen.update((open) => !open);
  }

  protected closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  protected copyUserId(): void {
    const id = this.user()?.applicationUserId;
    if (id && typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(id);
      this.isIdCopied.set(true);
      setTimeout(() => this.isIdCopied.set(false), 2000);
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeUserMenu();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeUserMenu();
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
        localStorage.setItem('wasla_portal_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }
}
