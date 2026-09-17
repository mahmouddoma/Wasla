import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormField, form, max, maxLength, min, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { AuthSession } from '../../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../../core/auth/permissions';
import {
  DoctorQualification,
  DoctorPublicProfile,
} from '../../../../domains/doctor-profile';
import { DoctorProfileApi } from '../../../../domains/doctor-profile';
import { ToastService } from '../../../../core/notifications/toast.service';

@Component({
  selector: 'app-public-profile-manager',
  imports: [FormField, TranslatePipe],
  templateUrl: './public-profile-manager.html',
  styleUrl: './public-profile-manager.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicProfileManager implements OnInit {
  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(DoctorProfileApi);
  private readonly session = inject(AuthSession);
  private readonly toast = inject(ToastService);
  protected readonly canView = this.session.hasPermission(PERMISSIONS.doctorProfileViewOwn);
  protected readonly canUpdate = this.session.hasPermission(PERMISSIONS.doctorProfileUpdateOwn);
  protected readonly profile = signal<DoctorPublicProfile | null>(null);
  protected readonly qualifications = signal<DoctorQualification[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly messages = signal<string[]>([]);
  protected readonly editingQualificationId = signal<string | null>(null);
  protected readonly bioModel = signal({ bio: '' });
  protected readonly bioForm = form(this.bioModel, (field) =>
    maxLength(field.bio, 2000, { message: 'profile.bioLength' }),
  );
  protected readonly qualificationModel = signal({ nameAr: '', nameEn: '', displayOrder: 0 });
  protected readonly qualificationForm = form(this.qualificationModel, (field) => {
    required(field.nameAr, { message: 'profile.qualificationRequired' });
    maxLength(field.nameAr, 300);
    maxLength(field.nameEn, 300);
    min(field.displayOrder, 0);
    max(field.displayOrder, 10000);
  });

  async ngOnInit(): Promise<void> {
    if (!this.canView && !this.canUpdate) {
      this.isLoading.set(false);
      return;
    }
    await this.load();
  }

  protected async saveBio(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.bioForm, async () => {
      const current = this.profile();
      const bio = this.bioModel().bio.trim();
      if (!current || !this.canUpdate || this.isSubmitting()) return;
      if (/[<>]/.test(bio)) {
        this.messages.set([this.uiLanguage.t('profile.plainTextRequired')]);
        return;
      }
      this.isSubmitting.set(true);
      try {
        const response = await firstValueFrom(this.api.updateBio(bio || null, current.rowVersion));
        this.setProfile(response);
        this.toast.success(this.uiLanguage.t('profile.bioSaved'));
      } catch (error) {
        this.setErrors(error);
        if (error instanceof HttpErrorResponse && error.status === 409) await this.loadProfile();
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }

  protected editQualification(item: DoctorQualification): void {
    this.editingQualificationId.set(item.id);
    this.qualificationModel.set({
      nameAr: item.nameAr,
      nameEn: item.nameEn ?? '',
      displayOrder: item.displayOrder,
    });
    this.qualificationForm().reset();
  }

  protected cancelQualificationEdit(): void {
    this.editingQualificationId.set(null);
    this.qualificationModel.set({ nameAr: '', nameEn: '', displayOrder: 0 });
    this.qualificationForm().reset();
  }

  protected async saveQualification(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.qualificationForm, async () => {
      if (!this.canUpdate || this.isSubmitting()) return;
      this.isSubmitting.set(true);
      try {
        const value = this.qualificationModel();
        const request = {
          nameAr: value.nameAr.trim(),
          nameEn: value.nameEn.trim() || null,
          displayOrder: value.displayOrder,
        };
        const editing = this.qualifications().find(
          (item) => item.id === this.editingQualificationId(),
        );
        if (editing)
          await firstValueFrom(
            this.api.updateQualification(editing.id, {
              ...request,
              rowVersion: editing.rowVersion,
            }),
          );
        else await firstValueFrom(this.api.addQualification(request));
        await this.loadQualifications();
        this.cancelQualificationEdit();
        this.toast.success(editing ? this.uiLanguage.t('profile.qualificationSaved') : this.uiLanguage.t('profile.qualificationAdded'));
      } catch (error) {
        this.setErrors(error);
        if (error instanceof HttpErrorResponse && (error.status === 404 || error.status === 409))
          await this.loadQualifications();
      } finally {
        this.isSubmitting.set(false);
      }
    });
  }

  protected async deleteQualification(item: DoctorQualification): Promise<void> {
    if (!window.confirm(this.uiLanguage.t('profile.deleteQualificationPrompt'))) return;
    this.isSubmitting.set(true);
    try {
      await firstValueFrom(this.api.deleteQualification(item.id, item.rowVersion));
      await this.loadQualifications();
      this.toast.success(this.uiLanguage.t('profile.qualificationDeleted'));
    } catch (error) {
      this.setErrors(error);
      if (error instanceof HttpErrorResponse && (error.status === 404 || error.status === 409))
        await this.loadQualifications();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    await Promise.all([this.loadProfile(), this.loadQualifications()]);
    this.isLoading.set(false);
  }
  private async loadProfile(): Promise<void> {
    try {
      this.setProfile(await firstValueFrom(this.api.publicProfile()));
    } catch (error) {
      this.setErrors(error);
    }
  }
  private async loadQualifications(): Promise<void> {
    try {
      this.qualifications.set(
        (await firstValueFrom(this.api.qualifications())).sort(
          (a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id),
        ),
      );
    } catch (error) {
      this.setErrors(error);
    }
  }
  private setProfile(profile: DoctorPublicProfile): void {
    this.profile.set(profile);
    this.bioModel.set({ bio: profile.bio ?? '' });
    this.bioForm().reset();
  }
  private setErrors(error: unknown): void {
    const parsed = parseApiErrors(error);
    this.messages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
  }
}
