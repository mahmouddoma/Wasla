import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CurrentUser } from '../../../../core/auth/auth.models';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../../../../shared/components/language-switcher/language-switcher';

@Component({
  selector: 'app-landing-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LanguageSwitcher],
  templateUrl: './landing-navbar.component.html',
  styleUrl: './landing-navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingNavbarComponent {
  readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  readonly user = input<CurrentUser | null>(null);
  readonly workspaceRoute = input<string>('/workspace');
  readonly sectionNavigate = output<string>();

  protected readonly mobileMenuOpen = signal(false);

  protected navigateTo(route: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.mobileMenuOpen.set(false);
    this.router.navigateByUrl(route);
  }

  protected onNavigateSection(sectionId: string, event: Event): void {
    event.preventDefault();
    this.mobileMenuOpen.set(false);
    this.sectionNavigate.emit(sectionId);
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.mobileMenuOpen.set(false);
  }
}
