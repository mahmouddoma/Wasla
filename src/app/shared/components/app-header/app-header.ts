import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CurrentUser } from '../../../core/auth/auth.models';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { PatientsApi } from '../../../domains/patients/patients-api';

export interface HeaderNavLink {
  labelKey: string;
  route: string;
  iconClass: string;
}

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LanguageSwitcher],
  templateUrl: './app-header.html',
  styleUrl: './app-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeader {
  readonly user = input<CurrentUser | null>(null);
  readonly home = input<string>('/');
  readonly menuId = input<string>('sidebar');
  readonly menuExpanded = input(false);
  readonly showMenuToggle = input(true);
  readonly menuToggle = output<void>();
  readonly logout = output<void>();
  readonly langService = inject(LanguageService);
  private readonly patientsApi = inject(PatientsApi, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  protected readonly isUserMenuOpen = signal(false);
  protected readonly avatarUrl = signal<string | null>(null);
  protected readonly userInitial = computed(
    () => this.user()?.userName?.trim().charAt(0).toUpperCase() || '',
  );
  protected readonly userRole = computed(
    () => this.user()?.roles?.join(this.langService.t('ui.full.0')) || this.user()?.userType || '',
  );

  protected readonly roleNavLinks = computed<HeaderNavLink[]>(() => {
    const u = this.user();
    if (!u) {
      return [
        { labelKey: 'pricing.navPricing', route: '/pricing', iconClass: 'fa-solid fa-tags' },
        { labelKey: 'pricing.navFindDoctor', route: '/doctors', iconClass: 'fa-solid fa-user-doctor' },
      ];
    }

    const perms = new Set(u.permissions ?? []);
    const has = (p: string) => perms.size === 0 || perms.has(p);

    switch (u.userType) {
      case 'SuperAdmin':
        return [
          { labelKey: 'common.workspace', route: '/admin', iconClass: 'fa-solid fa-gauge-high' },
          { labelKey: 'sidebar.patients', route: '/admin/doctors', iconClass: 'fa-solid fa-user-doctor' },
          { labelKey: 'subscriptions.mine', route: '/admin/subscriptions', iconClass: 'fa-solid fa-credit-card' },
        ];
      case 'Doctor': {
        const links: HeaderNavLink[] = [
          { labelKey: 'common.workspace', route: '/doctor/dashboard', iconClass: 'fa-solid fa-gauge-high' },
        ];
        if (has('Reservations.View')) {
          links.push({ labelKey: 'sidebar.reservations', route: '/reservations', iconClass: 'fa-solid fa-calendar-check' });
        }
        if (has('Patients.View')) {
          links.push({ labelKey: 'sidebar.myPatients', route: '/doctor/patients', iconClass: 'fa-solid fa-users' });
        }
        if (has('Subscriptions.ViewOwn')) {
          links.push({ labelKey: 'subscriptions.mine', route: '/doctor/subscription', iconClass: 'fa-solid fa-crown' });
        }
        return links;
      }
      case 'Reception': {
        const links: HeaderNavLink[] = [];
        if (has('Reservations.View')) {
          links.push({ labelKey: 'sidebar.reservations', route: '/reservations', iconClass: 'fa-solid fa-calendar-check' });
        }
        if (has('Tickets.View')) {
          links.push({ labelKey: 'sidebar.queue', route: '/tickets/queue', iconClass: 'fa-solid fa-list-ol' });
        }
        if (has('Payments.View')) {
          links.push({ labelKey: 'sidebar.finance', route: '/finance', iconClass: 'fa-solid fa-wallet' });
        }
        return links;
      }
      case 'Patient':
        return [
          { labelKey: 'sidebar.tickets', route: '/patient/tickets', iconClass: 'fa-solid fa-ticket' },
          { labelKey: 'patientRecord.title', route: '/patient/record', iconClass: 'fa-solid fa-file-medical' },
          { labelKey: 'pricing.navFindDoctor', route: '/doctors', iconClass: 'fa-solid fa-user-doctor' },
        ];
      case 'DrugCatalogManager':
        return [
          { labelKey: 'common.workspace', route: '/drug-catalog', iconClass: 'fa-solid fa-pills' },
        ];
      case 'MedicalCatalogManager':
        return [
          { labelKey: 'common.workspace', route: '/medical-catalog', iconClass: 'fa-solid fa-stethoscope' },
        ];
      default:
        return [];
    }
  });

  constructor() {
    effect(() => {
      const u = this.user();
      if (u?.userType === 'Patient' && this.patientsApi) {
        this.patientsApi.profileImage().subscribe({
          next: (res) => {
            if (res.body && res.body.size > 0) {
              const url = URL.createObjectURL(res.body);
              this.revokeAvatarUrl();
              this.avatarUrl.set(url);
            }
          },
          error: () => {
            this.revokeAvatarUrl();
            this.avatarUrl.set(null);
          },
        });
      } else {
        this.revokeAvatarUrl();
        this.avatarUrl.set(null);
      }
    });

    this.destroyRef.onDestroy(() => this.revokeAvatarUrl());
  }

  private revokeAvatarUrl(): void {
    const current = this.avatarUrl();
    if (current && current.startsWith('blob:')) {
      URL.revokeObjectURL(current);
    }
  }

  protected toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.isUserMenuOpen.update((open) => !open);
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }
}
