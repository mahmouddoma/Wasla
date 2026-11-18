import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrentUser } from '../../../../core/auth/auth.models';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../../../../shared/components/language-switcher/language-switcher';

@Component({
  selector: 'app-landing-navbar',
  standalone: true,
  imports: [RouterLink, TranslatePipe, LanguageSwitcher],
  templateUrl: './landing-navbar.component.html',
  styleUrl: './landing-navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingNavbarComponent implements OnInit {
  readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  readonly user = input<CurrentUser | null>(null);
  readonly workspaceRoute = input<string>('/workspace');
  readonly sectionNavigate = output<string>();

  protected readonly isScrolled = signal(false);
  protected readonly activeSection = signal<string>('');

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.checkScroll();
    }
  }

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    this.checkScroll();
  }

  private checkScroll(): void {
    if (typeof window === 'undefined') return;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    this.isScrolled.set(scrollY > 20);

    // Track active section for mobile dock highlighting
    if (typeof document !== 'undefined') {
      const sections = ['faq-section', 'pricing-section', 'product-showcase', 'features'];
      const scrollPos = scrollY + 240;
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            this.activeSection.set(id === 'product-showcase' ? 'features' : id);
            return;
          }
        }
      }
      if (scrollY < 200) {
        this.activeSection.set('');
      }
    }
  }

  protected navigateTo(route: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.router.navigateByUrl(route);
  }

  protected onNavigateSection(sectionId: string, event: Event): void {
    event.preventDefault();
    this.activeSection.set(sectionId === 'product-showcase' ? 'features' : sectionId);
    this.sectionNavigate.emit(sectionId);
    if (typeof document !== 'undefined') {
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}
