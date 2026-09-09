import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormField, email, form, maxLength, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../core/auth/api-errors';
import { AuthSession } from '../../../core/auth/auth-session';
import { PERMISSIONS } from '../../../core/auth/permissions';
import {
  PatientContact,
  PatientProfile as PatientProfileModel,
  PatientRelationshipType,
} from '../../../core/patients/patient.models';
import { PatientsApi } from '../../../core/patients/patients-api';

@Component({
  selector: 'app-patient-profile',
  imports: [FormField, RouterLink],
  templateUrl: './patient-profile.html',
  styleUrl: '../../healthcare-workspace.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientProfile {
  private readonly api = inject(PatientsApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly profile = signal<PatientProfileModel | null>(null);
  protected readonly contacts = signal<PatientContact[]>([]);
  protected readonly imageUrl = signal('');
  protected readonly imageLoading = signal(false);
  protected readonly profileModel = signal({ nameAr: '', nameEn: '', phoneNumber: '', email: '' });
  protected readonly profileForm = form(this.profileModel, (field) => {
    required(field.nameAr, { message: 'الاسم بالعربية مطلوب.' });
    maxLength(field.nameAr, 200);
    maxLength(field.nameEn, 200);
    email(field.email, { message: 'صيغة البريد الإلكتروني غير صحيحة.' });
  });
  protected readonly contactModel = signal({
    nameAr: '',
    nameEn: '',
    phoneNumber: '',
    relationshipType: 'Guardian' as PatientRelationshipType,
    linkedPatientId: '',
    isPrimary: false,
  });
  protected readonly contactForm = form(this.contactModel, (field) => {
    required(field.nameAr, { message: 'اسم جهة الاتصال مطلوب.' });
    required(field.phoneNumber, { message: 'رقم الهاتف مطلوب.' });
  });
  protected readonly editingContactId = signal('');
  protected readonly profileImage = signal<File | undefined>(undefined);
  protected readonly loading = signal(true);
  protected readonly savingProfile = signal(false);
  protected readonly savingContact = signal(false);
  protected readonly messages = signal<string[]>([]);
  protected readonly successMessage = signal('');
  protected readonly canUpdateProfile = this.session.hasPermission(
    PERMISSIONS.patientProfileUpdateOwn,
  );
  protected readonly canViewContacts = this.session.hasPermission(
    PERMISSIONS.patientContactsViewOwn,
  );
  protected readonly canManageContacts = this.session.hasPermission(
    PERMISSIONS.patientContactsManageOwn,
  );
  protected readonly usablePrimaryContacts = computed(
    () =>
      this.contacts().filter((contact) => contact.isPrimary && contact.phoneNumber.trim()).length,
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.revokeImageUrl());
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.messages.set([]);
    try {
      const profile = await firstValueFrom(this.api.profile());
      this.profile.set(profile);
      this.profileModel.set({
        nameAr: profile.nameAr,
        nameEn: profile.nameEn ?? '',
        phoneNumber: profile.phoneNumber ?? '',
        email: profile.email ?? '',
      });
      this.profileForm().reset();
      await Promise.all([
        profile.hasProfileImage ? this.loadImage() : Promise.resolve(),
        this.canViewContacts || this.canManageContacts ? this.loadContacts() : Promise.resolve(),
      ]);
    } catch (error) {
      this.messages.set(flattenErrors(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected async saveProfile(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.profileForm, async () => {
      const profile = this.profile();
      if (!profile || !this.canUpdateProfile || this.savingProfile()) return;
      if (
        profile.phoneNumber?.trim() &&
        !this.profileModel().phoneNumber.trim() &&
        (this.canViewContacts || this.canManageContacts) &&
        !this.usablePrimaryContacts()
      ) {
        this.messages.set(['لا يمكن إزالة هاتف المريض بدون جهة اتصال أساسية صالحة.']);
        return;
      }
      this.savingProfile.set(true);
      this.resetFeedback();
      try {
        const updated = await firstValueFrom(
          this.api.updateProfile({
            ...this.profileModel(),
            rowVersion: profile.rowVersion,
            profileImage: this.profileImage(),
          }),
        );
        this.profile.set(updated);
        this.profileImage.set(undefined);
        this.successMessage.set('تم حفظ الملف الشخصي وتحديث نسخة البيانات.');
        if (updated.hasProfileImage) await this.loadImage();
      } catch (error) {
        this.messages.set(flattenErrors(error));
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.messages.update((items) => [
            ...items,
            'تم تحديث الملف من مكان آخر؛ أُعيد تحميل أحدث نسخة.',
          ]);
          await this.load();
        }
      } finally {
        this.savingProfile.set(false);
      }
    });
  }

  protected editContact(contact: PatientContact): void {
    this.editingContactId.set(contact.contactId);
    this.contactModel.set({
      nameAr: contact.nameAr,
      nameEn: contact.nameEn ?? '',
      phoneNumber: contact.phoneNumber,
      relationshipType: contact.relationshipType,
      linkedPatientId: contact.linkedPatientId ?? '',
      isPrimary: contact.isPrimary,
    });
    this.contactForm().reset();
  }

  protected cancelContactEdit(): void {
    this.editingContactId.set('');
    this.contactModel.set(emptyContact());
    this.contactForm().reset();
  }

  protected async saveContact(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.contactForm, async () => {
      if (!this.canManageContacts || this.savingContact()) return;
      this.savingContact.set(true);
      this.resetFeedback();
      try {
        const value = this.contactModel();
        const request = {
          ...value,
          nameEn: value.nameEn.trim() || null,
          linkedPatientId: value.linkedPatientId.trim() || null,
        };
        const contactId = this.editingContactId();
        if (contactId) await firstValueFrom(this.api.updateContact(contactId, request));
        else await firstValueFrom(this.api.addContact(request));
        await this.loadContacts();
        this.cancelContactEdit();
        this.successMessage.set(contactId ? 'تم تحديث جهة الاتصال.' : 'تمت إضافة جهة الاتصال.');
      } catch (error) {
        this.messages.set(flattenErrors(error));
      } finally {
        this.savingContact.set(false);
      }
    });
  }

  protected async deactivateContact(contact: PatientContact): Promise<void> {
    if (!this.canDelete(contact) || !confirm(`إلغاء جهة الاتصال ${contact.nameAr}؟`)) return;
    this.resetFeedback();
    try {
      await firstValueFrom(this.api.deactivateContact(contact.contactId));
      await this.loadContacts();
      this.successMessage.set('تم إلغاء جهة الاتصال.');
    } catch (error) {
      this.messages.set(flattenErrors(error));
    }
  }

  protected canDelete(contact: PatientContact): boolean {
    const hasPatientPhone = Boolean(this.profile()?.phoneNumber?.trim());
    return (
      this.canManageContacts &&
      (hasPatientPhone || !contact.isPrimary || this.usablePrimaryContacts() > 1)
    );
  }

  protected profileFileChanged(event: Event): void {
    this.profileImage.set((event.currentTarget as HTMLInputElement).files?.[0]);
  }

  protected logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }

  private async loadContacts(): Promise<void> {
    this.contacts.set(await firstValueFrom(this.api.contacts()));
  }

  private async loadImage(): Promise<void> {
    this.imageLoading.set(true);
    try {
      const response = await firstValueFrom(this.api.profileImage());
      this.revokeImageUrl();
      if (response.body) this.imageUrl.set(URL.createObjectURL(response.body));
    } catch (error) {
      this.messages.update((items) => [...items, ...flattenErrors(error)]);
    } finally {
      this.imageLoading.set(false);
    }
  }

  private revokeImageUrl(): void {
    const url = this.imageUrl();
    if (url) URL.revokeObjectURL(url);
    this.imageUrl.set('');
  }

  private resetFeedback(): void {
    this.messages.set([]);
    this.successMessage.set('');
  }
}

function emptyContact() {
  return {
    nameAr: '',
    nameEn: '',
    phoneNumber: '',
    relationshipType: 'Guardian' as PatientRelationshipType,
    linkedPatientId: '',
    isPrimary: false,
  };
}

function flattenErrors(error: unknown): string[] {
  const parsed = parseApiErrors(error);
  return [...parsed.messages, ...Object.values(parsed.fields).flat()];
}
