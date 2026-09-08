import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';
import { PERMISSIONS } from '../../core/auth/permissions';

@Component({
  selector: 'app-workspace',
  imports: [RouterLink],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Workspace {
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
