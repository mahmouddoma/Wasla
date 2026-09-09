import { Router, RouterLink } from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';
import { PERMISSIONS } from '../../core/auth/permissions';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../../shared/components/language-switcher/language-switcher';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';

@Component({
  selector: 'app-workspace',
  imports: [RouterLink, LanguageSwitcher, TranslatePipe],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Workspace {
  readonly langService = inject(LanguageService);
  protected readonly user = inject(AuthSession).user;
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  protected readonly canManageDoctorProfile =
    this.session.hasPermission(PERMISSIONS.doctorSpecializationsViewOwn) ||
    this.session.hasPermission(PERMISSIONS.doctorPracticeLocationManageOwn);
  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }
}
