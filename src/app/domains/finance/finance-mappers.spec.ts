import { toPaymentDetail } from './finance-mappers';
import { PaymentDetailResponse } from './finance.models';

describe('Payment detail API mapping', () => {
  it('preserves actual flat identity, clinic, segment, visit and financial data', () => {
    const response: PaymentDetailResponse = {
      payment: { id: 'p', transactionNumber: 'PAY-1', ticketId: 't', amount: 250, currencyCode: 'EGP', status: 'Paid', paymentMethod: 'Cash', businessDate: '2026-10-30', collectedOnUtc: '2026-10-30T10:00:00Z', rowVersion: 'v' },
      refund: null, ticketNumber: 4, isRefunded: false, canRefund: true, refundableAmount: 250,
      paymentCorrections: [], refundCorrections: [],
      patientId: 'pt', patientNameAr: 'اسم المريض', patientNameEn: 'Patient',
      doctorId: 'd', doctorNameAr: 'الطبيب', doctorNameEn: 'Doctor',
      doctorPracticeId: 'c', practiceNameAr: 'العيادة', practiceNameEn: 'Clinic',
      segmentNameAr: 'مسائي', segmentNameEn: 'Evening', visitTypeNameAr: 'كشف', visitTypeNameEn: 'Consultation',
    };
    const result = toPaymentDetail(response);
    expect(result.patient).toEqual({ id: 'pt', nameAr: 'اسم المريض', nameEn: 'Patient' });
    expect(result.practice.nameEn).toBe('Clinic');
    expect(result.doctor.nameEn).toBe('Doctor');
    expect(result.segment?.nameEn).toBe('Evening');
    expect(result.visitType?.nameEn).toBe('Consultation');
    expect(result.payment).toBe(response.payment);
    expect(result.refundableAmount).toBe(250);
    expect(toPaymentDetail(result).patient).toBe(result.patient);
  });
});
