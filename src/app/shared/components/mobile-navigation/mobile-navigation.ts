import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

import { NavigationItem, NAVIGATION_ICONS } from '../../../layout/navigation/navigation-item';

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
          paths: item.id === 'drug-catalog' ? 'exact' : 'subset',
          queryParams: 'ignored',
          fragment: 'ignored',
          matrixParams: 'ignored',
        }),
      )
    );
  });
}
