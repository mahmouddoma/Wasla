import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { PublicDiscoveryApi } from '../../../../domains/public-discovery';
import {
  AvailableDate,
  AvailableSlot,
  BookingOptions,
  PublicDoctorDetails,
  PublicPracticeSummary,
} from '../../../../domains/public-discovery';

@Component({
  selector: 'app-public-doctor-details',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './public-doctor-details.html',
  styleUrl: './public-doctor-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicDoctorDetailsPage {
  protected readonly uiLanguage = inject(LanguageService);

  private readonly api = inject(PublicDiscoveryApi);
  private readonly doctorId = inject(ActivatedRoute).snapshot.paramMap.get('doctorId') ?? '';
  private bookingRequest = 0;
  protected readonly doctor = signal<PublicDoctorDetails | null>(null);
  protected readonly selectedPractice = signal<PublicPracticeSummary | null>(null);
  protected readonly dates = signal<AvailableDate[]>([]);
  protected readonly selectedDate = signal('');
  protected readonly slots = signal<AvailableSlot[]>([]);
  protected readonly selectedTime = signal('');
  protected readonly options = signal<BookingOptions | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly bookingLoading = signal(false);
  protected readonly messages = signal<string[]>([]);
  protected readonly notFound = signal(false);
  protected readonly doctorImageBroken = signal(false);
  protected readonly brokenLogos = signal<string[]>([]);

  constructor() {
    void this.loadDoctor();
  }
  protected async choosePractice(practice: PublicPracticeSummary): Promise<void> {
    if (!practice.isBookable || practice.onlineBookingEnabled === false) return;
    const request = ++this.bookingRequest;
    this.selectedPractice.set(practice);
    this.dates.set([]);
    this.selectedDate.set('');
    this.selectedTime.set('');
    this.slots.set([]);
    this.options.set(null);
    this.messages.set([]);
    this.bookingLoading.set(true);
    try {
      const dates = await firstValueFrom(this.api.availableDates(practice.id));
      if (request === this.bookingRequest) this.dates.set(dates);
    } catch (error) {
      if (request === this.bookingRequest) this.setErrors(error);
    } finally {
      if (request === this.bookingRequest) this.bookingLoading.set(false);
    }
  }
  protected async chooseDate(date: string): Promise<void> {
    const practice = this.selectedPractice();
    if (!practice) return;
    const request = ++this.bookingRequest;
    this.selectedDate.set(date);
    this.slots.set([]);
    this.selectedTime.set('');
    this.options.set(null);
    this.messages.set([]);
    this.bookingLoading.set(true);
    try {
      const slots = await firstValueFrom(this.api.availableSlots(practice.id, date));
      if (request === this.bookingRequest) this.slots.set(slots);
    } catch (error) {
      if (request === this.bookingRequest) this.setErrors(error);
    } finally {
      if (request === this.bookingRequest) this.bookingLoading.set(false);
    }
  }
  protected async chooseSlot(time: string): Promise<void> {
    const practice = this.selectedPractice();
    const date = this.selectedDate();
    if (!practice || !date) return;
    const request = ++this.bookingRequest;
    this.selectedTime.set(time);
    this.options.set(null);
    this.messages.set([]);
    this.bookingLoading.set(true);
    try {
      const options = await firstValueFrom(this.api.bookingOptions(practice.id, date, time));
      if (request === this.bookingRequest) this.options.set(options);
    } catch (error) {
      if (request !== this.bookingRequest) return;
      this.setErrors(error);
      if (error instanceof HttpErrorResponse && error.status === 409) await this.chooseDate(date);
    } finally {
      if (request === this.bookingRequest) this.bookingLoading.set(false);
    }
  }
  protected logoFailed(id: string): void {
    this.brokenLogos.update((ids) => [...new Set([...ids, id])]);
  }
  private async loadDoctor(): Promise<void> {
    try {
      this.doctor.set(await firstValueFrom(this.api.doctor(this.doctorId)));
    } catch (error) {
      this.notFound.set(error instanceof HttpErrorResponse && error.status === 404);
      this.setErrors(error);
    } finally {
      this.isLoading.set(false);
    }
  }
  private setErrors(error: unknown): void {
    const parsed = parseApiErrors(error);
    this.messages.set([...parsed.messages, ...Object.values(parsed.fields).flat()]);
  }
}
