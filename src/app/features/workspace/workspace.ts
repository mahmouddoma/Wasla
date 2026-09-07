import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthSession } from '../../core/auth/auth-session';

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Workspace {
  protected readonly user = inject(AuthSession).user;
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }
}
