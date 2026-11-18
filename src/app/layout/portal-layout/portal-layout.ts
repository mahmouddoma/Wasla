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
  ElementRef,
  inject,
  signal,
  HostListener,
} from '@angular/core';
import gsap from 'gsap';
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
        this.closeSidebar();
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

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

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

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
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
    if (this.isSidebarOpen()) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  }

  protected openSidebar(): void {
    this.isSidebarOpen.set(true);
    if (this.prefersReducedMotion() || typeof window === 'undefined') return;

    requestAnimationFrame(() => {
      const root = this.elementRef.nativeElement;
      const sidebar = root.querySelector<HTMLElement>('.portal-sidebar');
      const backdrop = root.querySelector<HTMLElement>('.sidebar-backdrop');
      const brandLogo = root.querySelector<HTMLElement>('.brand-logo-icon');
      const isRtl = this.langService.isRtl();
      const dirX = isRtl ? 32 : -32;

      const cascadeItems = root.querySelectorAll<HTMLElement>(
        '.portal-sidebar .brand-text-block, .portal-sidebar .sidebar-group-title, .portal-sidebar .sidebar-nav-item, .portal-sidebar .btn-sidebar-logout',
      );

      gsap.killTweensOf([sidebar, backdrop, brandLogo, ...Array.from(cascadeItems)]);

      if (backdrop) {
        gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.28, ease: 'power2.out' });
      }

      if (sidebar) {
        sidebar.classList.add('is-animating');
        gsap.fromTo(
          sidebar,
          { x: isRtl ? '100%' : '-100%' },
          {
            x: '0%',
            duration: 0.36,
            ease: 'power3.out',
            clearProps: 'transform',
            onComplete: () => sidebar.classList.remove('is-animating'),
          },
        );
      }

      if (brandLogo) {
        gsap.fromTo(
          brandLogo,
          { scale: 0.88, rotate: isRtl ? -6 : 6 },
          { scale: 1, rotate: 0, duration: 0.35, ease: 'back.out(1.5)', clearProps: 'transform' },
        );
      }

      if (cascadeItems.length) {
        gsap.fromTo(
          cascadeItems,
          { opacity: 0, x: dirX },
          {
            opacity: 1,
            x: 0,
            duration: 0.28,
            stagger: 0.022,
            delay: 0.06,
            ease: 'power2.out',
            clearProps: 'all',
          },
        );
      }
    });
  }

  protected closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  protected toggleSidebarCollapse(): void {
    const next = !this.isSidebarCollapsed();
    this.isSidebarCollapsed.set(next);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('wasla_portal_sidebar_collapsed', String(next));
      }
    } catch {}

    if (this.prefersReducedMotion() || typeof window === 'undefined') return;

    this.animateSidebarCollapse(next);
  }

  private animateSidebarCollapse(collapsed: boolean): void {
    const root = this.elementRef.nativeElement;
    const sidebar = root.querySelector<HTMLElement>('.portal-sidebar');
    if (!sidebar) return;

    const mainWrapper = root.querySelector<HTMLElement>('.portal-main-wrapper');
    const chevron = root.querySelector<HTMLElement>('.collapse-chevron');
    const isRtl = this.langService.isRtl();
    const dirX = isRtl ? 28 : -28;

    const cascadeItems = root.querySelectorAll<HTMLElement>(
      '.portal-sidebar .brand-text-block, .portal-sidebar .sidebar-group-title, .portal-sidebar .sidebar-nav-item, .portal-sidebar .btn-sidebar-logout',
    );
    const textElements = root.querySelectorAll<HTMLElement>(
      '.portal-sidebar .brand-text-block, .portal-sidebar .sidebar-group-title, .portal-sidebar .sidebar-nav-item .nav-text, .portal-sidebar .btn-sidebar-logout .nav-text',
    );

    gsap.killTweensOf([
      sidebar,
      mainWrapper,
      chevron,
      ...Array.from(cascadeItems),
      ...Array.from(textElements),
    ]);
    sidebar.classList.add('is-animating');

    if (collapsed) {
      // ── Smooth Collapsing Choreography ──
      // 1. Text elements gracefully fade and slide towards the language edge
      gsap.to(textElements, {
        x: dirX * 0.6,
        opacity: 0,
        duration: 0.16,
        ease: 'power2.in',
      });

      // 2. Sidebar width and main content margin contract synchronously
      const collapseTl = gsap.timeline({
        onComplete: () => {
          sidebar.classList.remove('is-animating');
          gsap.set([sidebar, mainWrapper, chevron, ...Array.from(textElements)], {
            clearProps: 'all',
          });
        },
      });

      collapseTl.fromTo(
        sidebar,
        { width: 248 },
        {
          width: 80,
          duration: 0.34,
          ease: 'power3.inOut',
        },
        0,
      );

      if (mainWrapper && window.innerWidth > 992) {
        collapseTl.fromTo(
          mainWrapper,
          { marginInlineStart: 248 },
          {
            marginInlineStart: 80,
            duration: 0.34,
            ease: 'power3.inOut',
          },
          0,
        );
      }

      if (chevron) {
        collapseTl.to(
          chevron,
          {
            rotate: isRtl ? 180 : 0,
            duration: 0.28,
            ease: 'back.out(1.4)',
          },
          0,
        );
      }
    } else {
      // ── Smooth Expanding Choreography (Directional Staggered Waterfall) ──
      const expandTl = gsap.timeline({
        onComplete: () => {
          sidebar.classList.remove('is-animating');
          gsap.set([sidebar, mainWrapper, chevron, ...Array.from(cascadeItems)], {
            clearProps: 'all',
          });
        },
      });

      expandTl.fromTo(
        sidebar,
        { width: 80 },
        {
          width: 248,
          duration: 0.36,
          ease: 'power3.out',
        },
        0,
      );

      if (mainWrapper && window.innerWidth > 992) {
        expandTl.fromTo(
          mainWrapper,
          { marginInlineStart: 80 },
          {
            marginInlineStart: 248,
            duration: 0.36,
            ease: 'power3.out',
          },
          0,
        );
      }

      if (chevron) {
        expandTl.to(
          chevron,
          {
            rotate: isRtl ? 0 : 180,
            duration: 0.28,
            ease: 'back.out(1.4)',
          },
          0,
        );
      }

      // Smooth cascade: Stagger items sequentially from the language direction (from right in RTL)
      if (cascadeItems.length) {
        expandTl.fromTo(
          cascadeItems,
          { x: dirX, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.28,
            stagger: 0.02,
            ease: 'power2.out',
          },
          0.06,
        );
      }
    }
  }
}
