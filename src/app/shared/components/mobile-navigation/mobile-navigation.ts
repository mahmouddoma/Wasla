import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

export const NAVIGATION_ICONS = {
  home: 'm3 10 9-7 9 7v10H3zM9 20v-7h6v7',
  calendar:
    'M8 3v4m8-4v4M3 11h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
  'user-check': 'M12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM3 21v-3a6 6 0 0 1 12 0v3m2-11 2 2 3-3',
  stethoscope:
    'M4.5 3v5a3.5 3.5 0 0 0 7 0V3M8 11.5V15a4.5 4.5 0 0 0 9 0v-2.5m2-2.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  building: 'M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 9h6m-6 4h6m-6 4h6',
  users:
    'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2m6 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  ticket:
    'M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Zm11-4v14',
  'heart-pulse':
    'M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3C14.7 3 13.5 3.5 12 5 10.5 3.5 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7ZM3 12h6l1-2 2 5 2-7 2 4h5',
  'clipboard-list':
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M8 13h8m-8 4h8',
  receipt:
    'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1ZM8 8h8m-8 4h8m-8 4h5',
  chart: 'M3 3v18h18M7 16l4-5 4 3 4-7',
  shield: 'M12 3 4 6v7c0 4 3 7 8 9 5-2 8-5 8-9V6ZM9 12l2 2 4-4',
  lock: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z',
} as const;

export interface NavigationItem {
  readonly id: string;
  readonly labelKey: string;
  readonly route: string;
  readonly icon: keyof typeof NAVIGATION_ICONS;
  readonly mobileLabelKey?: string;
}

@Component({
  selector: 'app-mobile-navigation',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './mobile-navigation.html',
  styleUrl: './mobile-navigation.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileNavigation {
  readonly items = input.required<readonly NavigationItem[]>();
  readonly menuId = input.required<string>();
  readonly menuExpanded = input(false);
  readonly more = output<void>();
  readonly navigate = output<void>();
  protected readonly icons = NAVIGATION_ICONS;
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly moreActive = computed(() => {
    this.currentUrl();
    return (
      this.menuExpanded() ||
      !this.items().some((item) =>
        this.router.isActive(item.route, {
          paths: 'subset',
          queryParams: 'ignored',
          fragment: 'ignored',
          matrixParams: 'ignored',
        }),
      )
    );
  });
}
