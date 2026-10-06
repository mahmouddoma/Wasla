import { AppHeader } from '../app-header/app-header';
import {
  MobileNavigation,
  NavigationItem,
  NAVIGATION_ICONS,
} from '../mobile-navigation/mobile-navigation';
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
import { ReceptionPracticeContext } from '../../../domains/reception-practices';

@Component({
  selector: 'app-portal-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, AppHeader, TranslatePipe, MobileNavigation],
  templateUrl: './portal-layout.html',
  styleUrl: './portal-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortalLayout {
  protected readonly navigationIcons = NAVIGATION_ICONS;
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
  protected readonly mobileNavItems = computed(() => {
    const primaryIds = this.isReception()
      ? ['workspace', 'reservations', 'queue', 'patients']
      : this.user()?.userType.toLowerCase() === 'doctor'
        ? ['workspace', 'reservations', 'queue', 'encounters']
        : this.user()?.userType === 'DrugCatalogManager'
          ? ['drug-catalog', 'drug-imports', 'medication-requests']
          : ['workspace', 'reservations', 'find-doctor', 'tickets'];
    return primaryIds
      .flatMap((id) => this.roleNavItems().filter((item) => item.id === id))
      .map((item) => ({ ...item, mobileLabelKey: 'navigation.' + item.id }));
  });

  protected readonly home = computed(() => {
    const user = this.user();
    return user ? this.session.destinationFor(user) : '/login';
  });

  protected readonly roleNavItems = computed<NavigationItem[]>(() => {
    const userType = this.user()?.userType?.toLowerCase();

    if (userType === 'drugcatalogmanager') {
      const items: NavigationItem[] = [
        { id: 'drug-catalog', labelKey: 'medications.title', route: '/drug-catalog', icon: 'clipboard-list' },
        { id: 'drug-imports', labelKey: 'imports.title', route: '/drug-catalog/imports', icon: 'clipboard-list' },
        { id: 'medication-requests', labelKey: 'requests.title', route: '/drug-catalog-requests', icon: 'clipboard-list' },
      ];
      return items.filter(item => item.id === 'drug-catalog' ? this.session.hasPermission('DrugCatalog.View')
        : item.id === 'drug-imports' ? ['DrugCatalog.Import', 'DrugCatalog.ImportHistory'].some(p => this.session.hasPermission(p))
        : this.session.hasPermission('DrugCatalogRequests.View'));
    }

    if (userType === 'doctor') {
      const items: NavigationItem[] = [
        ...(this.session.hasPermission('DrugCatalogRequests.ViewOwn') || this.session.hasPermission('DrugCatalogRequests.CreateOwn')
          ? [{ id: 'medication-requests', labelKey: 'requests.title', route: '/doctor/medication-requests', icon: 'clipboard-list' as const }] : []),
        ...(this.session.hasPermission(PERMISSIONS.medicalEncountersViewOwn)
          ? [
              {
                id: 'encounters',
                labelKey: 'encounters.title',
                route: '/doctor/encounters',
                icon: 'stethoscope' as const,
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
      return items.filter((item) => this.canAccessDoctorItem(item.id));
    }

    if (userType === 'reception') {
      const items: NavigationItem[] = [
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
          case 'family-requests':
            return [
              PERMISSIONS.familyRelationshipRequestsCreateAssisted,
              PERMISSIONS.familyRelationshipRequestsViewAssisted,
              PERMISSIONS.familyRelationshipRequestsResubmitAssisted,
            ].some((permission) => this.session.hasPermission(permission));
          default:
            return true;
        }
      });
    }

    // Default: Patient
    const items: NavigationItem[] = [
      ...(this.session.hasPermission('Prescriptions.ViewOwnCompleted')
        ? [{ id: 'prescriptions', labelKey: 'medications.prescription', route: '/patient/prescriptions', icon: 'clipboard-list' as const }] : []),
      ...(this.session.hasPermission(PERMISSIONS.medicalEncountersViewOwnCompleted)
        ? [
            {
              id: 'encounters',
              labelKey: 'encounters.title',
              route: '/patient/encounters',
              icon: 'stethoscope' as const,
            },
          ]
        : []),
      ...(this.session.hasPermission(PERMISSIONS.followUpEligibilityViewOwn)
        ? [
            {
              id: 'follow-ups',
              labelKey: 'followUps.title',
              route: '/patient/follow-ups',
              icon: 'calendar' as const,
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
    return items.filter((item) => this.canAccessPatientItem(item.id));
  });

  private canAccessDoctorItem(id: string): boolean {
    const required: Record<string, readonly string[]> = {
      reservations: ['DoctorPracticeReservations.ViewOwn'],
      profile: [
        PERMISSIONS.doctorSpecializationsViewOwn,
        PERMISSIONS.doctorPracticeLocationViewOwn,
        PERMISSIONS.doctorPracticeLocationManageOwn,
      ],
      practices: [PERMISSIONS.doctorPracticesViewOwn],
      receptions: [PERMISSIONS.receptionUsersViewOwn],
      finance: [PERMISSIONS.doctorPracticePaymentsViewOwn],
      revenue: [PERMISSIONS.doctorRevenueViewOwn],
    };
    return (
      !required[id] || required[id].some((permission) => this.session.hasPermission(permission))
    );
  }

  private canAccessPatientItem(id: string): boolean {
    const required: Record<string, readonly string[]> = {
      tickets: [PERMISSIONS.ticketsViewOwn],
      profile: [
        PERMISSIONS.patientProfileViewOwn,
        PERMISSIONS.patientProfileUpdateOwn,
        PERMISSIONS.patientContactsViewOwn,
        PERMISSIONS.patientContactsManageOwn,
      ],
      family: [
        PERMISSIONS.familiesViewOwn,
        PERMISSIONS.familyRelationshipRequestsCreate,
        PERMISSIONS.familyRelationshipRequestsViewOwn,
        PERMISSIONS.familyRelationshipRequestsResubmitOwn,
      ],
      finance: [PERMISSIONS.paymentsViewOwn],
    };
    return (
      !required[id] || required[id].some((permission) => this.session.hasPermission(permission))
    );
  }

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
        localStorage.setItem('wasla_portal_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }
}
