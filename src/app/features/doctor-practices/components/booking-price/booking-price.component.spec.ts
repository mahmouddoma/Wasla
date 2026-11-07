import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BookingPriceComponent } from './booking-price.component';
import { DoctorPracticePrice, DoctorPracticesApi } from '../../../../domains/doctor-practices';
import { SubscriptionState } from '../../../../domains/subscriptions';
import { subscriptionStateStub } from '../../../../../testing/subscriptions';
import { ToastService } from '../../../../core/notifications/toast.service';
import { AuthSession } from '../../../../core/auth/auth-session';
import { PublicDiscoveryApi } from '../../../../domains/public-discovery';

describe('BookingPriceComponent', () => {
  const price: DoctorPracticePrice = {
    id: 'price-1',
    segmentId: 'default',
    visitTypeId: 'consultation',
    price: 123,
    rowVersion: 'AQID',
  };
  const api = {
    prices: vi.fn(() => of<DoctorPracticePrice[]>([price])),
    segments: () => of([{ id: 'default', isDefault: true }]),
    visitTypes: () => of([{ id: 'consultation', type: 'NewConsultation' }]),
    updateBookingPrice: vi.fn(() => of({ ...price, rowVersion: 'BAUG' })),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    api.prices.mockReturnValue(of([price]));
    TestBed.configureTestingModule({
      imports: [BookingPriceComponent],
      providers: [
        { provide: DoctorPracticesApi, useValue: api },
        { provide: SubscriptionState, useValue: subscriptionStateStub() },
        { provide: ToastService, useValue: toast },
        { provide: AuthSession, useValue: { user: () => ({ doctorId: 'doctor' }) } },
        { provide: PublicDiscoveryApi, useValue: { doctor: () => of({ practices: [{ id: 'practice-1', publicSearchPrice: 200 }] }) } },
      ],
    });
  });
  it('loads only the default segment consultation price and sends its row version', async () => {
    const fixture = TestBed.createComponent(BookingPriceComponent);
    fixture.componentRef.setInput('practiceId', 'practice-1');
    fixture.componentRef.setInput('canManage', true);
    await fixture.whenStable();
    expect(fixture.componentInstance.price).toBe(123);
    fixture.componentInstance.price = 150;
    await fixture.componentInstance.save();
    expect(api.updateBookingPrice).toHaveBeenCalledWith('practice-1', {
      newConsultationPrice: 150,
      rowVersion: 'AQID',
    });
    expect(fixture.componentInstance.current()?.rowVersion).toBe('BAUG');
    expect(toast.success).toHaveBeenCalledOnce();
  });
  it('uses null for first creation and blocks invalid prices', async () => {
    api.prices.mockReturnValue(of([]));
    const fixture = TestBed.createComponent(BookingPriceComponent);
    fixture.componentRef.setInput('practiceId', 'practice-1');
    fixture.componentRef.setInput('canManage', true);
    await fixture.whenStable();
    fixture.componentInstance.price = 1.123;
    await fixture.componentInstance.save();
    expect(api.updateBookingPrice).not.toHaveBeenCalled();
    fixture.componentInstance.price = 150;
    await fixture.componentInstance.save();
    expect(api.updateBookingPrice).toHaveBeenCalledWith('practice-1', {
      newConsultationPrice: 150,
      rowVersion: null,
    });
  });
  it('does not read the full pricing catalog for a Booking Only practice', async () => {
    vi.spyOn(TestBed.inject(SubscriptionState), 'hasForPractice').mockImplementation((_practice, feature) => feature !== 'BASIC_SEGMENTS_PRICING');
    const fixture = TestBed.createComponent(BookingPriceComponent);
    fixture.componentRef.setInput('practiceId', 'practice-1');
    fixture.componentRef.setInput('canManage', true);
    await fixture.whenStable();
    expect(api.prices).not.toHaveBeenCalled();
    expect(fixture.componentInstance.price).toBe(200);
  });
});
