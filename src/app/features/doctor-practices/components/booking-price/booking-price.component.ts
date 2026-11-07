import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DoctorPracticePrice, DoctorPracticesApi } from '../../../../domains/doctor-practices';
import { SubscriptionState } from '../../../../domains/subscriptions';
import { parseApiErrors } from '../../../../core/auth/api-errors';
import { LanguageService } from '../../../../core/i18n/language.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { ToastService } from '../../../../core/notifications/toast.service';
import { AuthSession } from '../../../../core/auth/auth-session';
import { PublicDiscoveryApi } from '../../../../domains/public-discovery';

@Component({
  selector: 'app-booking-price',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './booking-price.component.html',
  styleUrl: './booking-price.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingPriceComponent implements OnInit {
  readonly practiceId = input.required<string>();
  readonly canManage = input(false);
  private readonly api = inject(DoctorPracticesApi);
  private readonly subscription = inject(SubscriptionState);
  private readonly language = inject(LanguageService);
  private readonly toast = inject(ToastService);
  private readonly session = inject(AuthSession);
  private readonly publicApi = inject(PublicDiscoveryApi);
  readonly current = signal<DoctorPracticePrice | null>(null);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal(false);
  price: number | null = null;
  async ngOnInit(): Promise<void> {
    await this.load();
  }
  async load(preserveInput = false): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    try {
      if (!this.subscription.hasForPractice(this.practiceId(), 'BASIC_SEGMENTS_PRICING')) {
        // Booking Only can update its default fee without reading the full pricing catalog.
        const doctorId = this.session.user()?.doctorId;
        if (doctorId) {
          try {
            const profile = await firstValueFrom(this.publicApi.doctor(doctorId));
            const practice = profile.practices.find(item => item.id === this.practiceId());
            if (!preserveInput) this.price = practice?.publicSearchPrice ?? null;
          } catch { /* An unpublished practice still supports a permitted first narrow write. */ }
        }
        return;
      }
      const [prices, segments, visitTypes] = await Promise.all([
        firstValueFrom(this.api.prices(this.practiceId())),
        firstValueFrom(this.api.segments(this.practiceId())),
        firstValueFrom(this.api.visitTypes(this.practiceId())),
      ]);
      const defaultSegment = segments.find((item) => item.isDefault);
      const consultation = visitTypes.find((item) => item.type === 'NewConsultation');
      if (!defaultSegment || !consultation) {
        this.error.set(true);
        return;
      }
      const current =
        prices.find(
          (item) => item.segmentId === defaultSegment.id && item.visitTypeId === consultation.id,
        ) ?? null;
      this.current.set(current);
      if (!preserveInput) this.price = current?.price ?? null;
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }
  valid(): boolean {
    return (
      this.price !== null &&
      Number.isFinite(this.price) &&
      this.price > 0 &&
      Math.abs(this.price * 100 - Math.round(this.price * 100)) < 0.000001
    );
  }
  async save(): Promise<void> {
    if (
      !this.valid() ||
      !this.canManage() ||
      this.loading() ||
      this.busy() ||
      this.error() ||
      !this.subscription.hasForPractice(this.practiceId(), 'PRACTICE_MANAGEMENT', true)
    )
      return;
    this.busy.set(true);
    try {
      const price = await firstValueFrom(
        this.api.updateBookingPrice(this.practiceId(), {
          newConsultationPrice: this.price!,
          rowVersion: this.current()?.rowVersion ?? null,
        }),
      );
      this.current.set(price);
      this.price = price.price;
      this.toast.success(this.language.t('subscriptions.saved'));
    } catch (error) {
      this.toast.error(
        this.language.t(parseApiErrors(error).messages[0] ?? 'common.requestFailed'),
      );
      if (parseApiErrors(error).status === 409) await this.load(true);
    } finally {
      this.busy.set(false);
    }
  }
}
