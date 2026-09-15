import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { parseApiErrors } from '../../core/auth/api-errors';
import { PublicDiscoveryApi } from '../../core/public-discovery/public-discovery-api';
import {
  AvailableDate,
  AvailableSlot,
  BookingOptions,
  PublicDoctorDetails,
  PublicPracticeSummary,
} from '../../core/public-discovery/public-discovery.models';

@Component({
  selector: 'app-public-doctor-details',
  imports: [RouterLink],
  templateUrl: './public-doctor-details.html',
  styleUrl: './public-doctor-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicDoctorDetailsPage {
  private readonly api = inject(PublicDiscoveryApi);
  private readonly doctorId = inject(ActivatedRoute).snapshot.paramMap.get('doctorId') ?? '';
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
    if (!practice.isBookable) return;
    this.selectedPractice.set(practice);
    this.selectedDate.set('');
    this.slots.set([]);
    this.options.set(null);
    this.messages.set([]);
    this.bookingLoading.set(true);
    try {
      this.dates.set(await firstValueFrom(this.api.availableDates(practice.id)));
    } catch (error) {
      this.setErrors(error);
    } finally {
      this.bookingLoading.set(false);
    }
  }
  protected async chooseDate(date: string): Promise<void> {
    const practice = this.selectedPractice();
    if (!practice) return;
    this.selectedDate.set(date);
    this.selectedTime.set('');
    this.options.set(null);
    this.bookingLoading.set(true);
    try {
      this.slots.set(await firstValueFrom(this.api.availableSlots(practice.id, date)));
    } catch (error) {
      this.setErrors(error);
    } finally {
      this.bookingLoading.set(false);
    }
  }
  protected async chooseSlot(time: string): Promise<void> {
    const practice = this.selectedPractice();
    const date = this.selectedDate();
    if (!practice || !date) return;
    this.selectedTime.set(time);
    this.bookingLoading.set(true);
    try {
      this.options.set(await firstValueFrom(this.api.bookingOptions(practice.id, date, time)));
    } catch (error) {
      this.setErrors(error);
      if (error instanceof HttpErrorResponse && error.status === 409) await this.chooseDate(date);
    } finally {
      this.bookingLoading.set(false);
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
