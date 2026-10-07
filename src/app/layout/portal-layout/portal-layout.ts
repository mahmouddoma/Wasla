import { AppHeader } from '../../shared/components/app-header/app-header';
import { MobileNavigation } from '../../shared/components/mobile-navigation/mobile-navigation';
import { NAVIGATION_ICONS } from '../navigation/navigation-item';
import { PortalNavigation } from '../navigation/portal-navigation';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  HostListener,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

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
