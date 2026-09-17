import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

export type PageHeaderIcon =
  'doctors' | 'admins' | 'roles' | 'specializations' | 'requests' | 'family-requests';

@Component({
  selector: 'app-page-header',
  imports: [RouterLink],
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  private readonly destroyRef = inject(DestroyRef);

  readonly heading = input.required<string>();
  readonly description = input.required<string>();
  readonly icon = input.required<PageHeaderIcon>();

  readonly actionLabel = input<string | null>(null);
  readonly actionIcon = input<'add' | 'refresh' | 'none'>('add');
  readonly actionDisabled = input(false);
  readonly actionLoading = input(false);
  readonly actionPermission = input(true);
  readonly actionRouterLink = input<string | readonly unknown[] | null>(null);
  readonly actionClicked = output<void>();

  protected readonly bgImages: readonly string[] = [
    '/images-bg/bg-slide-1.webp',
    '/images-bg/bg-slide-2.webp',
    '/images-bg/bg-slide-3.webp',
    '/images-bg/bg-slide-4.webp',
    '/images-bg/bg-slide-5.webp',
  ];

  protected readonly activeBgIndex = signal(0);
  protected readonly loadedSlides = signal<ReadonlySet<number>>(new Set([0]));

  constructor() {
    const timer = setInterval(() => {
      const nextIndex = (this.activeBgIndex() + 1) % this.bgImages.length;
      this.loadedSlides.update((set) => {
        const nextSet = new Set(set);
        nextSet.add(nextIndex);
        return nextSet;
      });
      this.activeBgIndex.set(nextIndex);
    }, 6000);

    this.destroyRef.onDestroy(() => {
      clearInterval(timer);
    });
  }
}
