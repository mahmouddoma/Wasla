import { computed, inject, Injectable } from '@angular/core';
import { AuthSession } from '../../core/auth/auth-session';
import { PERMISSIONS } from '../../core/auth/permissions';
import { ReceptionPracticeContext } from '../../domains/reception-practices';
import { NavigationItem } from './navigation-item';

export type NavigationGroup = 'daily' | 'health' | 'management' | 'finance' | 'account';
export interface NavigationSection {
  readonly id: NavigationGroup;
  readonly labelKey: string;
  readonly items: readonly NavigationItem[];
}

/** Application navigation only: no API orchestration or duplicated feature state. */
@Injectable({ providedIn: 'root' })
export class PortalNavigation {
  private readonly session = inject(AuthSession);
  readonly practiceContext = inject(ReceptionPracticeContext);
  private readonly user = this.session.user;
  private readonly isReception = computed(() => this.user()?.userType === 'Reception');
  readonly mobileItems = computed(() => {
    const primaryIds = this.isReception()
      ? ['workspace', 'reservations', 'queue', 'patients']
      : this.user()?.userType.toLowerCase() === 'doctor'
        ? ['workspace', 'reservations', 'queue', 'encounters']
        : this.user()?.userType === 'MedicalCatalogManager'
          ? [
              'lab-catalog',
              'radiology-catalog',
              'lab-catalog-requests',
              'radiology-catalog-requests',
            ]
          : this.user()?.userType === 'DrugCatalogManager'
            ? ['drug-catalog', 'drug-imports', 'medication-requests']
            : ['workspace', 'reservations', 'find-doctor', 'tickets'];
    return primaryIds
      .flatMap((id) => this.items().filter((item) => item.id === id))
      .map((item) => ({
        ...item,
        mobileLabelKey:
          item.id === 'tickets'
            ? 'portal.mobile.myTurn'
            : [
                  'lab-catalog',
                  'radiology-catalog',
                  'lab-catalog-requests',
                  'radiology-catalog-requests',
                ].includes(item.id)
              ? item.labelKey
              : 'navigation.' + item.id,
      }));
  });

  private readonly permittedItems = computed<NavigationItem[]>(() => {
    const userType = this.user()?.userType?.toLowerCase();

    if (userType === 'medicalcatalogmanager') {
      return (['lab', 'radiology'] as const).flatMap((kind) => {
        const prefix = kind === 'lab' ? 'Lab' : 'Radiology';
        return [
          ...(this.session.hasPermission(prefix + 'Catalog.View')
            ? [
                {
                  id: `${kind}-catalog`,
                  labelKey: `diagnostics.${kind}Catalog`,
                  route: `/medical-catalog/${kind}`,
                  icon: 'clipboard-list' as const,
                },
              ]
            : []),
          ...(this.session.hasPermission(prefix + 'Catalog.Import') ||
          this.session.hasPermission(prefix + 'Catalog.ImportHistory')
            ? [
                {
                  id: `${kind}-imports`,
                  labelKey: `diagnostics.${kind}Imports`,
                  route: `/medical-catalog/${kind}/imports`,
                  icon: 'clipboard-list' as const,
                },
              ]
            : []),
          ...(this.session.hasPermission(prefix + 'CatalogRequests.View')
            ? [
                {
                  id: `${kind}-catalog-requests`,
                  labelKey: `diagnostics.${kind}CatalogRequests`,
                  route: `/medical-catalog/${kind}/requests`,
                  icon: 'clipboard-list' as const,
                },
              ]
            : []),
        ];
      });
    }
    if (userType === 'drugcatalogmanager') {
      const items: NavigationItem[] = [
        {
          id: 'drug-catalog',
          labelKey: 'medications.title',
          route: '/drug-catalog',
          icon: 'clipboard-list',
        },
        {
          id: 'drug-imports',
          labelKey: 'imports.title',
          route: '/drug-catalog/imports',
          icon: 'clipboard-list',
        },
        {
          id: 'medication-requests',
          labelKey: 'requests.title',
          route: '/drug-catalog-requests',
          icon: 'clipboard-list',
        },
      ];
      return items.filter((item) =>
        item.id === 'drug-catalog'
          ? this.session.hasPermission('DrugCatalog.View')
          : item.id === 'drug-imports'
            ? ['DrugCatalog.Import', 'DrugCatalog.ImportHistory'].some((p) =>
                this.session.hasPermission(p),
              )
            : this.session.hasPermission('DrugCatalogRequests.View'),
      );
    }

    if (userType === 'doctor') {
      const items: NavigationItem[] = [
        ...this.diagnosticItems('Doctor'),
        ...(['lab', 'radiology'] as const).flatMap((kind) =>
          this.session.hasPermission(
            (kind === 'lab' ? 'Lab' : 'Radiology') + 'CatalogRequests.ViewOwn',
          ) ||
          this.session.hasPermission(
            (kind === 'lab' ? 'Lab' : 'Radiology') + 'CatalogRequests.CreateOwn',
          )
            ? [
                {
                  id: `${kind}-catalog-requests`,
                  labelKey: `diagnostics.${kind}CatalogRequests`,
                  route: `/doctor/catalog-requests/${kind}`,
                  icon: 'clipboard-list' as const,
                },
              ]
            : [],
        ),
        ...(this.session.hasPermission('DrugCatalogRequests.ViewOwn') ||
        this.session.hasPermission('DrugCatalogRequests.CreateOwn')
          ? [
              {
                id: 'medication-requests',
                labelKey: 'requests.title',
                route: '/doctor/medication-requests',
                icon: 'clipboard-list' as const,
              },
            ]
          : []),
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
      ...this.diagnosticItems('Patient'),
      ...(this.session.hasPermission('Prescriptions.ViewOwnCompleted')
        ? [
            {
              id: 'prescriptions',
              labelKey: 'medications.prescription',
              route: '/patient/prescriptions',
              icon: 'clipboard-list' as const,
            },
          ]
        : []),
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

  private diagnosticItems(actor: 'Doctor' | 'Patient'): NavigationItem[] {
    return (['lab', 'radiology'] as const).flatMap((kind) => {
      const prefix = kind === 'lab' ? 'Lab' : 'Radiology';
      const permissions =
        actor === 'Doctor'
          ? [
              prefix + 'Requests.ViewOwn',
              prefix + 'Results.ViewOwn',
              prefix + 'ResultSubmissions.ViewOwn',
            ]
          : [prefix + 'Requests.ViewOwnIssued', prefix + 'Results.ViewOwnCurrent'];
      return permissions.some((p) => this.session.hasPermission(p))
        ? [
            {
              id: `${kind}-requests`,
              labelKey: `diagnostics.${kind}Requests`,
              route: `/diagnostics/${actor.toLowerCase()}/${kind}`,
              icon: 'clipboard-list' as const,
            },
          ]
        : [];
    });
  }
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

  readonly items = computed(() =>
    this.permittedItems().map((item) => ({
      ...item,
      labelKey:
        (
          {
            workspace: 'navigation.workspace',
            reservations: 'portal.nav.appointments',
            queue: 'portal.nav.queue',
            patients: 'navigation.patients',
            'find-doctor': 'portal.nav.findDoctor',
            tickets: 'portal.nav.myTurn',
            encounters: 'navigation.encounters',
            practices: 'portal.nav.clinics',
          } as Readonly<Record<string, string>>
        )[item.id] ?? item.labelKey,
    })),
  );
  readonly sections = computed<NavigationSection[]>(() => {
    const groupIds: Record<NavigationGroup, readonly string[]> = {
      daily: this.isReception()
        ? ['workspace', 'reservations', 'patients', 'queue']
        : [
            'workspace',
            'reservations',
            'find-doctor',
            'queue',
            'tickets',
            ...(this.user()?.userType === 'Doctor' ? ['encounters'] : []),
          ],
      health:
        this.user()?.userType === 'Patient'
          ? ['encounters', 'prescriptions', 'follow-ups', 'lab-requests', 'radiology-requests']
          : this.user()?.userType === 'Doctor'
            ? ['lab-requests', 'radiology-requests']
            : [],
      management: [
        'practices',
        'receptions',
        'medication-requests',
        'drug-catalog',
        'drug-imports',
        'lab-catalog',
        'lab-imports',
        'lab-catalog-requests',
        'radiology-catalog',
        'radiology-imports',
        'radiology-catalog-requests',
        'family-requests',
        ...(this.user()?.userType === 'Doctor' ? ['profile'] : []),
      ],
      finance: this.user()?.userType === 'Patient' ? [] : ['finance', 'revenue'],
      account: this.user()?.userType === 'Patient' ? ['profile', 'family', 'finance'] : [],
    };
    return (Object.keys(groupIds) as NavigationGroup[])
      .map((id) => ({
        id,
        labelKey:
          id === 'management' && this.user()?.userType === 'DrugCatalogManager'
            ? 'portal.group.catalog'
            : 'portal.group.' + id,
        items: groupIds[id].flatMap((itemId) => this.items().filter((item) => item.id === itemId)),
      }))
      .filter((section) => section.items.length > 0);
  });
}
