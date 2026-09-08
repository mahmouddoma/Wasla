import {
  DoctorSpecializationHistoryItem,
  DoctorSpecializationItem,
  DoctorSpecializationRequest,
  DoctorSpecializationRequestStatus,
  DoctorSpecializationRequestType,
  DoctorSpecializationSelection,
} from '../doctor-profile/doctor-profile.models';

export interface DoctorSpecializationRequestsQuery {
  status?: DoctorSpecializationRequestStatus;
  type?: DoctorSpecializationRequestType;
  search?: string;
  pageNumber: number;
  pageSize: number;
}

export interface DoctorSpecializationRequestListItem {
  requestId: string;
  doctorId: string;
  doctorNameAr: string;
  doctorNameEn: string | null;
  email: string;
  type: DoctorSpecializationRequestType;
  status: DoctorSpecializationRequestStatus;
  currentRevisionNumber: number;
  submittedOnUtc: string;
  rowVersion: string;
}

export interface DoctorSpecializationRequestsPage {
  items: DoctorSpecializationRequestListItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface DoctorSpecializationRevision {
  revisionNumber: number;
  specializations: DoctorSpecializationItem[];
  createdOnUtc?: string;
  createdByApplicationUserId?: string;
}

export interface DoctorSpecializationRequestDetails {
  request: DoctorSpecializationRequest;
  doctorId: string;
  doctorNameAr: string;
  doctorNameEn: string | null;
  email: string;
  currentEffectiveSpecializations: DoctorSpecializationItem[];
  revisions: DoctorSpecializationRevision[];
  history: DoctorSpecializationHistoryItem[];
}

export interface AdjustDoctorSpecializationsRequest {
  specializations: DoctorSpecializationSelection[];
  reason: string;
  rowVersion: string;
}

export interface RequestDoctorSpecializationModificationRequest {
  message: string;
  rowVersion: string;
}

export interface ReviewDoctorSpecializationRequest {
  rowVersion: string;
}

export interface RejectDoctorSpecializationRequest extends ReviewDoctorSpecializationRequest {
  reason: string;
}
