import { AppHeader } from '../../shared/components/app-header/app-header';
import { MobileNavigation } from '../../shared/components/mobile-navigation/mobile-navigation';
import { NAVIGATION_ICONS, NavigationItem } from '../navigation/navigation-item';
import { PortalNavigation } from '../navigation/portal-navigation';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  HostListener,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DoctorRouteAccess } from '../../domains/doctors';
import { ReceptionRouteAccess } from '../../domains/reception-practices';
import { AuthSession } from '../../core/auth/auth-session';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ToastService } from '../../core/notifications/toast.service';
import {
  SubscriptionState,
  isDoctorSubscriptionGatedRoute,
  subscriptionFeatureForRoute,
} from '../../domains/subscriptions';

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
  private readonly navigation = inject(PortalNavigation);
  protected readonly practiceContext = this.navigation.practiceContext;
  protected readonly navigationSections = this.navigation.sections;
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  protected readonly subscription = inject(SubscriptionState);
  private readonly toast = inject(ToastService);
  protected readonly currentUrl = signal(
    this.router.url || (typeof window !== 'undefined' ? window.location.pathname : ''),
  );
  protected readonly gateRefreshing = signal(false);

  constructor() {
    inject(DoctorRouteAccess).watch().pipe(takeUntilDestroyed()).subscribe();
    inject(ReceptionRouteAccess).watch().pipe(takeUntilDestroyed()).subscribe();
    if (this.isReception()) {
      void this.practiceContext.ensureLoaded?.();
    }
    const sub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const nextUrl = event.urlAfterRedirects || event.url;
        this.currentUrl.set(nextUrl);
      });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());

    effect(() => {
      if (this.isSubscriptionGateActive()) {
        this.toast.clearErrors?.();
      }
    });
  }

  protected readonly currentNavItem = computed(() => {
    const path = this.currentUrl().split(/[?#]/)[0];
    return (
      this.navigation
        .items()
        .find((item) => path === item.route || path.startsWith(item.route + '/')) ?? null
    );
  });

  protected readonly currentPageLabelKey = computed(
    () => this.currentNavItem()?.labelKey ?? 'navigation.workspace',
  );

  protected readonly currentPageIcon = computed<NavigationItem['icon']>(
    () => this.currentNavItem()?.icon ?? 'home',
  );

  protected readonly isSubscriptionGateActive = computed(() => {
    if (this.user()?.userType !== 'Doctor') return false;
    const path = this.currentUrl().split(/[?#]/)[0];
    if (!path || !isDoctorSubscriptionGatedRoute(path)) return false;
    if (this.subscription.deniedRoute() === path) return true;
    if (!this.subscription.hasLoaded()) return false;
    if (
      !this.subscription.hasActiveSubscription() &&
      (this.subscription.contracts().length === 0 || this.subscription.hasPendingSubscription())
    ) {
      return true;
    }
    const feature = subscriptionFeatureForRoute(path);
    if (feature && this.subscription.hasActiveSubscription() && !this.subscription.has(feature)) {
      return true;
    }
    return false;
  });

  protected readonly subscriptionGateMode = computed<'none' | 'pending' | 'upgrade'>(() => {
    if (this.subscription.hasPendingSubscription()) return 'pending';
    if (this.subscription.hasActiveSubscription()) return 'upgrade';
    return 'none';
  });

  protected async refreshSubscriptionGate(): Promise<void> {
    if (this.gateRefreshing()) return;
    this.gateRefreshing.set(true);
    try {
      this.subscription.clearRouteDenied();
      await this.subscription.refresh(true);
    } finally {
      this.gateRefreshing.set(false);
    }
  }

  protected selectPractice(event: Event): void {
    const el = (event.target || event.currentTarget) as HTMLSelectElement | null;
    if (el) {
      this.practiceContext.select(el.value);
    }
  }

  protected readonly isSidebarOpen = signal(false);
  protected readonly isSidebarCollapsed = signal<boolean>(
    typeof localStorage !== 'undefined' &&
      localStorage.getItem('wasla_portal_sidebar_collapsed') === 'true',
  );

  protected readonly user = this.session.user;
  protected readonly isReception = computed(() => this.user()?.userType === 'Reception');
  protected readonly mobileNavItems = this.navigation.mobileItems;
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
        localStorage.setItem('wasla_portal_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }
}
