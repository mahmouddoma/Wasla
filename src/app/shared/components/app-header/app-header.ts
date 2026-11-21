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
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { CurrentUser } from '../../../core/auth/auth.models';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { PatientsApi } from '../../../domains/patients/patients-api';

export interface HeaderNavLink {
  labelKey: string;
  route: string;
  iconClass: string;
  sectionId?: string;
  isRoute?: boolean;
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
  readonly minimal = input(false);
  readonly menuToggle = output<void>();
  readonly logout = output<void>();
  readonly langService = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly patientsApi = inject(PatientsApi, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  protected readonly isUserMenuOpen = signal(false);
  protected readonly isGuestMenuOpen = signal(false);
  protected readonly avatarUrl = signal<string | null>(null);

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.closeGuestMenu();
        this.isUserMenuOpen.set(false);
      });

    effect((onCleanup) => {
      const u = this.user();
      let active = true;
      this.revokeAvatarUrl();
      onCleanup(() => {
        active = false;
        this.revokeAvatarUrl();
      });
      if (u?.userType === 'Patient' && this.patientsApi) {
        const request = this.patientsApi.profileImage().subscribe({
          next: (res) => {
            if (!active || this.destroyRef.destroyed || this.user() !== u) return;
            if (res.body && res.body.size > 0) {
              const url = URL.createObjectURL(res.body);
              this.revokeAvatarUrl();
              this.avatarUrl.set(url);
            }
          },
          error: () => {
            if (!active || this.destroyRef.destroyed || this.user() !== u) return;
            this.revokeAvatarUrl();
          },
        });
        onCleanup(() => request.unsubscribe());
      }
    });

  }

  protected toggleGuestMenu(): void {
    this.isGuestMenuOpen.update((v) => !v);
  }

  protected closeGuestMenu(): void {
    this.isGuestMenuOpen.set(false);
  }

  protected onNavigateSection(link: HeaderNavLink, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.closeGuestMenu();
    if (link.sectionId) {
      if (this.router.url === '/' || this.router.url.startsWith('/#')) {
        const el = document.getElementById(link.sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        void this.router.navigate(['/'], { fragment: link.sectionId }).then(() => {
          setTimeout(() => {
            const el = document.getElementById(link.sectionId!);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        });
      }
    } else {
      void this.router.navigateByUrl(link.route);
    }
  }

  protected navigateTo(route: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.closeGuestMenu();
    this.router.navigateByUrl(route);
  }

  protected readonly userInitial = computed(
    () => this.user()?.userName?.trim().charAt(0).toUpperCase() || '',
  );
  protected readonly userRole = computed(() => {
    const u = this.user();
    if (!u) return '';
    const translateRole = (role: string): string => {
      const key = `userRole.${role}`;
      const translated = this.langService.t(key);
      return translated === key ? role : translated;
    };
    if (u.roles?.length) {
      return u.roles.map(translateRole).join(this.langService.t('ui.full.0'));
    }
    return u.userType ? translateRole(u.userType) : '';
  });

  protected readonly roleNavLinks = computed<HeaderNavLink[]>(() => {
    const u = this.user();
    if (!u) {
      return [
        { labelKey: 'landing.nav.features', route: '/#product-showcase', iconClass: 'fa-solid fa-sparkles', sectionId: 'product-showcase' },
        { labelKey: 'landing.nav.howItWorks', route: '/#clinic-journey', iconClass: 'fa-solid fa-route', sectionId: 'clinic-journey' },
        { labelKey: 'pricing.navPricing', route: '/#pricing-section', iconClass: 'fa-solid fa-tags', sectionId: 'pricing-section' },
        { labelKey: 'pricing.navFindDoctor', route: '/doctors', iconClass: 'fa-solid fa-user-doctor', isRoute: true },
      ];
    }

    const perms = new Set(u.permissions ?? []);
    const has = (p: string) => perms.size === 0 || perms.has(p);

    switch (u.userType) {
      case 'SuperAdmin':
        return [
          { labelKey: 'common.workspace', route: '/admin', iconClass: 'fa-solid fa-gauge-high', isRoute: true },
          { labelKey: 'admin.navDoctors', route: '/admin/doctors', iconClass: 'fa-solid fa-user-doctor', isRoute: true },
          { labelKey: 'subscriptions.admin', route: '/admin/subscriptions', iconClass: 'fa-solid fa-credit-card', isRoute: true },
        ];
      case 'Doctor': {
        const links: HeaderNavLink[] = [
          { labelKey: 'common.workspace', route: '/doctor/dashboard', iconClass: 'fa-solid fa-gauge-high', isRoute: true },
        ];
        if (has('Reservations.View')) {
          links.push({ labelKey: 'sidebar.reservations', route: '/reservations', iconClass: 'fa-solid fa-calendar-check', isRoute: true });
        }
        if (has('Patients.View')) {
          links.push({ labelKey: 'sidebar.myPatients', route: '/doctor/patients', iconClass: 'fa-solid fa-users', isRoute: true });
        }
        if (has('Subscriptions.ViewOwn')) {
          links.push({ labelKey: 'subscriptions.mine', route: '/doctor/subscription', iconClass: 'fa-solid fa-crown', isRoute: true });
        }
        return links;
      }
      case 'Reception': {
        const links: HeaderNavLink[] = [];
        if (has('Reservations.View')) {
          links.push({ labelKey: 'sidebar.reservations', route: '/reservations', iconClass: 'fa-solid fa-calendar-check', isRoute: true });
        }
        if (has('Tickets.View')) {
          links.push({ labelKey: 'sidebar.queue', route: '/tickets/queue', iconClass: 'fa-solid fa-list-ol', isRoute: true });
        }
        if (has('Payments.View')) {
          links.push({ labelKey: 'sidebar.finance', route: '/finance', iconClass: 'fa-solid fa-wallet', isRoute: true });
        }
        return links;
      }
      case 'Patient':
        return [
          { labelKey: 'sidebar.tickets', route: '/patient/tickets', iconClass: 'fa-solid fa-ticket', isRoute: true },
          { labelKey: 'patientRecord.title', route: '/patient/record', iconClass: 'fa-solid fa-file-medical', isRoute: true },
          { labelKey: 'pricing.navFindDoctor', route: '/doctors', iconClass: 'fa-solid fa-user-doctor', isRoute: true },
        ];
      case 'DrugCatalogManager':
        return [
          { labelKey: 'common.workspace', route: '/drug-catalog', iconClass: 'fa-solid fa-pills', isRoute: true },
        ];
      case 'MedicalCatalogManager':
        return [
          { labelKey: 'common.workspace', route: '/medical-catalog', iconClass: 'fa-solid fa-stethoscope', isRoute: true },
        ];
      default:
        return [];
    }
  });


  private revokeAvatarUrl(): void {
    const current = untracked(this.avatarUrl);
    this.avatarUrl.set(null);
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
