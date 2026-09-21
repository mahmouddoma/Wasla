import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthSession } from '../../../core/auth/auth-session';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SidebarService } from './sidebar.service';

export interface SidebarNavItem {
  id: string;
  labelKey: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-workspace-sidebar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './workspace-sidebar.html',
  styleUrl: './workspace-sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSidebarComponent {
  readonly sidebarService = inject(SidebarService);
  readonly langService = inject(LanguageService);
  private readonly session = inject(AuthSession);

  readonly area = input<string | null | undefined>(null);

  protected readonly effectiveArea = computed(() => {
    const direct = this.area()?.toLowerCase();
    if (direct === 'doctor' || direct === 'patient') return direct;
    const userType = this.session.user()?.userType?.toLowerCase();
    if (userType === 'doctor') return 'doctor';
    return 'patient';
  });

  protected readonly navItems = computed<SidebarNavItem[]>(() => {
    const isDoctor = this.effectiveArea() === 'doctor';

    if (isDoctor) {
      return [
        {
          id: 'workspace',
          labelKey: 'sidebar.workspace',
          route: '/workspace/doctor',
          icon: 'home',
        },
        {
          id: 'reservations',
          labelKey: 'sidebar.reservations',
          route: '/doctor/reservations',
          icon: 'calendar',
        },
        {
          id: 'queue',
          labelKey: 'sidebar.queue',
          route: '/doctor/queue',
          icon: 'clock',
        },
        {
          id: 'profile',
          labelKey: 'sidebar.doctorProfile',
          route: '/doctor/profile',
          icon: 'stethoscope',
        },
        {
          id: 'practices',
          labelKey: 'sidebar.practices',
          route: '/doctor/practices',
          icon: 'building',
        },
        {
          id: 'receptions',
          labelKey: 'sidebar.receptions',
          route: '/doctor/receptions',
          icon: 'users',
        },
      ];
    }

    return [
      {
        id: 'workspace',
        labelKey: 'sidebar.workspace',
        route: '/workspace/patient',
        icon: 'home',
      },
      {
        id: 'reservations',
        labelKey: 'sidebar.reservations',
        route: '/patient/reservations',
        icon: 'calendar',
      },
      {
        id: 'tickets',
        labelKey: 'sidebar.tickets',
        route: '/patient/tickets',
        icon: 'ticket',
      },
      {
        id: 'profile',
        labelKey: 'sidebar.healthProfile',
        route: '/patient/profile',
        icon: 'heart-pulse',
      },
      {
        id: 'family',
        labelKey: 'sidebar.family',
        route: '/patient/family',
        icon: 'users',
      },
    ];
  });

  protected onLinkClick(): void {
    if (this.sidebarService.isOpenMobile()) {
      this.sidebarService.closeMobile();
    }
  }

  protected toggleCollapse(): void {
    this.sidebarService.toggleCollapse();
  }

  protected closeMobile(): void {
    this.sidebarService.closeMobile();
  }
}
