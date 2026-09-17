import { Gender } from '../../../../core/auth/auth.models';
import { DoctorApprovalStatus } from '../../../../domains/doctors';

export type DoctorMediaType =
  | 'ProfileImage'
  | 'PersonalIdFront'
  | 'PersonalIdBack'
  | 'SyndicateCardFront'
  | 'SyndicateCardBack';

export interface AdminDoctorsQuery {
  approvalStatus?: DoctorApprovalStatus;
  searchText?: string;
  pageNumber: number;
  pageSize: number;
}

export interface AdminDoctorListItem {
  doctorId: string;
  nameAr: string;
  nameEn: string | null;
  email: string;
  phone: string;
  dateOfBirth: string;
  age: number;
  gender: Gender;
  approvalStatus: DoctorApprovalStatus;
  hasProfileImage: boolean;
  hasPersonalIdFront: boolean;
  hasPersonalIdBack: boolean;
  hasSyndicateFront: boolean;
  hasSyndicateBack: boolean;
  createdOnUtc: string;
}

export interface AdminDoctorsPage {
  items: AdminDoctorListItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface AdminDoctorDetails extends Omit<AdminDoctorListItem, 'createdOnUtc'> {
  applicationUserId: string;
  userName: string;
  nationalId: string | null;
  approvedByApplicationUserId: string | null;
  approvedOnUtc: string | null;
  rejectedByApplicationUserId: string | null;
  rejectedOnUtc: string | null;
  rejectionReason: string | null;
  suspendedByApplicationUserId: string | null;
  suspendedOnUtc: string | null;
  suspensionReason: string | null;
  reactivatedByApplicationUserId: string | null;
  reactivatedOnUtc: string | null;
  rowVersion: string;
}

export interface ApproveDoctorRequest {
  nationalId: string;
  rowVersion: string;
}

export interface RejectDoctorRequest {
  reason: string;
  rowVersion: string;
}

export interface SuspendDoctorRequest {
  reason: string;
  rowVersion: string;
}

export interface ReactivateDoctorRequest {
  rowVersion: string;
}

export interface DoctorLifecycleResponse {
  doctorId: string;
  approvalStatus: DoctorApprovalStatus;
  rowVersion: string;
  cancelledReservationCount?: number;
}

export interface DoctorSuspensionImpact {
  futureActiveReservationsCount: number;
  practices: { doctorPracticeId: string; nameAr: string; nameEn?: string | null; futureActiveReservationsCount: number }[];
  earliestAppointmentUtc?: string | null;
  latestAppointmentUtc?: string | null;
}
