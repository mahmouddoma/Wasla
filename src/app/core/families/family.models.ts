import { PagedResponse } from '../patients/patient.models';

export type FamilyRole = 'Father' | 'Mother' | 'Child' | 'Guardian' | 'LegalGuardian';
export type FamilyRequestType = 'CreateFamily' | 'AddFamilyMember';
export type FamilyRequestStatus = 'Pending' | 'ModificationRequested' | 'Approved' | 'Rejected';

export interface FamilyMember {
  patientId: string;
  nameAr: string;
  nameEn: string | null;
  role: FamilyRole;
  gender: 'Male' | 'Female';
}

export interface Family {
  familyId: string;
  status: string;
  members: FamilyMember[];
}

export interface FamilyRequestQuery {
  status?: FamilyRequestStatus | '';
  requestType?: FamilyRequestType | '';
  search?: string;
  pageNumber: number;
  pageSize: number;
}

export interface FamilyRequestSummary {
  requestId: string;
  requestType: FamilyRequestType;
  status: FamilyRequestStatus;
  requesterPatientId: string;
  requesterNameAr: string;
  targetPatientId: string;
  targetNameAr: string;
  requesterClaimedRole: Exclude<FamilyRole, 'Child'>;
  targetClaimedRole: FamilyRole;
  currentRevisionNumber: number;
  submittedOnUtc: string;
  rowVersion: string;
}

export interface FamilyRequestDocument {
  documentId: string;
  documentType: string;
  fileName: string;
  revisionNumber: number;
}

export interface FamilyRequestHistoryItem {
  action: string;
  occurredOnUtc: string;
  message: string | null;
  revisionNumber: number;
}

export interface FamilyRequestDetails extends FamilyRequestSummary {
  familyId: string | null;
  modificationMessage: string | null;
  rejectionReason: string | null;
  currentFamilyMembers: FamilyMember[];
  documents: FamilyRequestDocument[];
  history: FamilyRequestHistoryItem[];
}

export interface SubmitFamilyRequest {
  requestType: FamilyRequestType;
  familyId: string;
  targetPatientId: string;
  requesterClaimedRole: Exclude<FamilyRole, 'Child'>;
  targetClaimedRole: FamilyRole;
  evidenceFiles: File[];
  documentTypes: string[];
}

export interface SubmitAssistedFamilyRequest extends SubmitFamilyRequest {
  requesterPatientId: string;
}

export interface ResubmitFamilyRequest {
  evidenceFiles: File[];
  documentTypes: string[];
  rowVersion: string;
}

export interface FamilyReviewMessageRequest {
  message: string;
  rowVersion: string;
}

export interface FamilyReviewReasonRequest {
  reason: string;
  rowVersion: string;
}

export interface FamilyReviewDecisionRequest {
  rowVersion: string;
}

export type FamilyRequestPage = PagedResponse<FamilyRequestSummary>;
