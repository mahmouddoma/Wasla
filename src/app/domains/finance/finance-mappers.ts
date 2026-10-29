import { PaymentDetail, PaymentDetailResponse } from './finance.models';

export function toPaymentDetail(response: PaymentDetailResponse): PaymentDetail {
  return {
    ...response,
    patient: response.patient ?? { id: response.patientId ?? '', nameAr: response.patientNameAr ?? '', nameEn: response.patientNameEn },
    doctor: response.doctor ?? { id: response.doctorId ?? '', nameAr: response.doctorNameAr ?? '', nameEn: response.doctorNameEn },
    practice: response.practice ?? { id: response.doctorPracticeId ?? '', nameAr: response.practiceNameAr ?? '', nameEn: response.practiceNameEn },
    segment: response.segment ?? { nameAr: response.segmentNameAr, nameEn: response.segmentNameEn },
    visitType: response.visitType ?? { nameAr: response.visitTypeNameAr, nameEn: response.visitTypeNameEn },
  };
}
