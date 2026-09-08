import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  protected readonly user = this.session.user;
  protected readonly canViewDoctors = computed(() =>
    this.session.hasPermission(PERMISSIONS.doctorsViewAll),
  );
  protected readonly canViewSuperAdmins = computed(() =>
    this.session.hasPermission(PERMISSIONS.superAdminsViewAll),
  );
  protected readonly canViewRoles = computed(() =>
    this.session.hasPermission(PERMISSIONS.rolesView),
  );
  protected readonly home = computed(() => {
    const user = this.user();
    return user ? this.session.destinationFor(user) : '/login';
  });

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }

  protected isCurrent(path: string): boolean {
    return this.router.url.startsWith(path);
  }
}
