import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
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
  private readonly destroyRef = inject(DestroyRef);
  protected readonly isFloating = signal(false);

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

  constructor() {
    if (typeof window !== 'undefined') {
      let ticking = false;
      const onScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
            const windowHeight = window.innerHeight;
            const docHeight = Math.max(
              document.body.scrollHeight,
              document.documentElement.scrollHeight,
            );
            const isAtBottom = windowHeight + scrollY >= docHeight - 35;
            const isScrolled = scrollY > 15;
            this.isFloating.set(isScrolled && !isAtBottom);
            ticking = false;
          });
          ticking = true;
        }
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      document.addEventListener('scroll', onScroll, { passive: true, capture: true });

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        document.removeEventListener('scroll', onScroll, true);
      });
    }
  }
}
