import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
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
  protected readonly isUserMenuOpen = signal(false);
  protected readonly userInitial = computed(
    () => this.user()?.userName?.trim().charAt(0).toUpperCase() || '',
  );
  protected readonly userRole = computed(
    () => this.user()?.roles?.join(this.langService.t('ui.full.0')) || this.user()?.userType || '',
  );

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
