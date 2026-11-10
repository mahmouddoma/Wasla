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
import { RouterLink } from '@angular/router';
import { CurrentUser } from '../../../core/auth/auth.models';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { PatientsApi } from '../../../domains/patients/patients-api';

@Component({
  selector: 'app-header',
  imports: [RouterLink, TranslatePipe, LanguageSwitcher],
  templateUrl: './app-header.html',
  styleUrl: './app-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeader {
  readonly user = input.required<CurrentUser | null>();
  readonly home = input.required<string>();
  readonly menuId = input.required<string>();
  readonly menuExpanded = input(false);
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
