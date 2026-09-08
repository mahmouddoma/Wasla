export interface MedicalSpecializationOption {
  id: string;
  nameAr: string;
  nameEn: string | null;
}

export interface DoctorSpecializationSelection {
  medicalSpecializationId: string;
  isPrimary: boolean;
}

export interface DoctorSpecializationItem extends DoctorSpecializationSelection {
  nameAr: string;
  nameEn: string | null;
}

export interface DoctorSpecializationsResponse {
  items: DoctorSpecializationItem[];
}

export type DoctorSpecializationRequestType = 'Initial' | 'Change';
export type DoctorSpecializationRequestStatus =
  'PendingReview' | 'ModificationRequested' | 'Approved' | 'Rejected';

export interface DoctorSpecializationRequest {
  requestId: string;
  type: DoctorSpecializationRequestType;
  status: DoctorSpecializationRequestStatus;
  currentRevisionNumber: number;
  latestRevision: DoctorSpecializationItem[];
  latestModificationMessage: string | null;
  rowVersion: string;
}

export interface SubmitDoctorSpecializationsRequest {
  specializations: DoctorSpecializationSelection[];
}

export interface ResubmitDoctorSpecializationsRequest extends SubmitDoctorSpecializationsRequest {
  rowVersion: string;
}

export type DoctorSpecializationHistoryAction =
  | 'Submitted'
  | 'Resubmitted'
  | 'SpecializationsAdjustedBySuperAdmin'
  | 'ModificationRequested'
  | 'Approved'
  | 'Rejected';

export interface DoctorSpecializationHistoryItem {
  id: string;
  action: DoctorSpecializationHistoryAction;
  revisionNumber: number;
  previousRevisionNumber: number | null;
  message: string | null;
  performedByApplicationUserId: string;
  performedOnUtc: string;
}

export interface EgyptLocationOption {
  id: number;
  nameAr: string;
  nameEn: string | null;
}

export interface DoctorPracticeLocation {
  id: string;
  governorate: EgyptLocationOption;
  city: EgyptLocationOption;
  area: EgyptLocationOption;
  detailedAddress: string;
  latitude: number;
  longitude: number;
  rowVersion: string;
}

export interface UpsertDoctorPracticeLocationRequest {
  governorateId: number;
  cityId: number;
  areaId: number;
  detailedAddress: string;
  latitude: number;
  longitude: number;
  rowVersion: string | null;
}
