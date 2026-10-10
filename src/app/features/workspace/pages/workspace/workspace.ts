import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthSession } from '../../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../../core/auth/permissions';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { PortalNavigation } from '../../../../layout/navigation/portal-navigation';
import { NavigationItem, NAVIGATION_ICONS } from '../../../../layout/navigation/navigation-item';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

interface WorkspaceTask extends NavigationItem {
  readonly descriptionKey: string;
  readonly queryParams?: Readonly<Record<string, string>>;
}

@Component({
  selector: 'app-workspace',
  imports: [RouterLink, TranslatePipe, PageHeader],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Workspace {
  readonly langService = inject(LanguageService);
  private readonly session = inject(AuthSession);
  private readonly navigation = inject(PortalNavigation);
  private readonly document = inject(DOCUMENT);
  protected readonly reception = this.navigation.practiceContext;
  protected readonly icons = NAVIGATION_ICONS;
  protected readonly role = computed(() => this.session.user()?.userType ?? 'Patient');
  protected readonly copyRole = computed(() => {
    const role = this.role();
    return role === 'Reception'
      ? 'reception'
      : role === 'Doctor'
        ? 'doctor'
        : role === 'Patient'
          ? 'patient'
          : 'other';
  });
  protected readonly practiceName = computed(() => {
    const practice = this.reception.currentPractice();
    return practice
      ? this.langService.isRtl()
        ? practice.nameAr
        : practice.nameEn || practice.nameAr
      : '';
  });
  protected readonly userDisplayName = computed(() => {
    const user = this.session.user();
    if (!user) return '';
    return user.userName || '';
  });
  protected readonly todayFormatted = computed(() => {
    const isAr = this.langService.isRtl();
    const date = new Date();
    try {
      return date.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return date.toDateString();
    }
  });
  protected readonly tasks = computed<WorkspaceTask[]>(() => {
    const task = (
      id: string,
      key: string,
      queryParams?: Readonly<Record<string, string>>,
    ): WorkspaceTask[] => {
      const item = this.navigation.items().find((item) => item.id === id);
      return item
        ? [
          {
            ...item,
            labelKey: 'workspace.task.' + key,
            descriptionKey: 'workspace.task.' + key + 'Desc',
            queryParams,
          },
        ]
        : [];
    };
    if (this.role() === 'Reception') {
      const query = { practiceId: this.reception.currentPracticeId() };
      // Existing reservation entry point opens its editor when supplied a date.
      const today = new Date();
      const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      return [
        ...(this.reception.allows(PERMISSIONS.practiceReservationsCreate)
          ? task('reservations', 'newReservation', { ...query, date })
          : []),
        ...task(
          'patients',
          this.session.hasPermission(PERMISSIONS.patientsSearchBasic)
            ? 'findPatient'
            : 'registerPatient',
        ),
        ...(this.reception.allows(PERMISSIONS.practiceReservationsView)
          ? task('reservations', 'openReservations', query)
          : []),
        ...(this.reception.allows(PERMISSIONS.practiceTicketsView)
          ? task('queue', 'openQueue')
          : []),
      ];
    }
    if (this.role() === 'Doctor') {
      return [
        ...task('queue', 'nextPatient'),
        ...task('reservations', 'openReservations'),
        ...task('encounters', 'openEncounters'),
      ];
    }
    if (this.role() === 'Patient') {
      return [
        ...task('find-doctor', 'bookAppointment'),
        ...task('reservations', 'myAppointments'),
        ...task('tickets', 'myTurn'),
      ];
    }
    return [];
  });
  protected readonly secondary = computed(() => {
    const ids =
      this.role() === 'Doctor' ? ['practices'] : this.role() === 'Patient' ? ['follow-ups'] : [];
    return this.navigation.items().filter((item) => ids.includes(item.id));
  });
  protected readonly illustration = computed(() =>
    this.role() === 'Patient'
      ? '/SVG-AVATAR/Medical prescription-bro.svg'
      : '/SVG-AVATAR/Doctors-bro.svg',
  );

  protected choosePractice(): void {
    this.document.getElementById('reception-current-practice')?.focus();
  }
  protected retryPractices(): void {
    void this.reception.refresh();
  }
}
