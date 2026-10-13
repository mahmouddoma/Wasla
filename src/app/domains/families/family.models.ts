import { PagedResponse } from '../patients';

export type FamilyRole = 'Father' | 'Mother' | 'Child' | 'Guardian' | 'LegalGuardian';
export type FamilyRequestType = 'CreateFamily' | 'AddFamilyMember';
export type FamilyRequestStatus = 'Pending' | 'ModificationRequested' | 'Approved' | 'Rejected';

export interface FamilyMember {
  patientId: string;
  nameAr: string;
  nameEn: string | null;
  role: FamilyRole;
  gender: 'Male' | 'Female';
  medicalAccess?: FamilyMedicalAccessStatus | null;
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

export type FamilyMedicalAccessRequestType = 'Restriction' | 'Restoration';
export type FamilyMedicalAccessRequestStatus =
  'Pending' | 'ModificationRequested' | 'Approved' | 'Rejected' | 'Withdrawn';
export type FamilyMedicalAccessStatusType =
  'Allowed' | 'Restricted' | 'AgeNotEligible' | 'RelationshipNotEligible' | 'Unavailable';
export type MedicalRecordResourceType =
  'prescription' | 'lab-request' | 'lab-result' | 'radiology-request' | 'radiology-result';

export interface FamilyMedicalAccessStatus {
  status: FamilyMedicalAccessStatusType;
  canView: boolean;
  canRequestRestriction: boolean;
  canRequestRestoration: boolean;
  activeOwnRequestId?: string | null;
  activeOwnRequestType?: FamilyMedicalAccessRequestType | null;
  unavailableReasonCode?: string | null;
}

export interface FamilyMedicalCaseCapabilities {
  canWithdraw: boolean;
  canResubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canRequestModification: boolean;
}

export interface FamilyMedicalDocument {
  documentId: string;
  fileName: string;
  documentType: string;
  canDownload: boolean;
}

export interface FamilyMedicalCase {
  requestId: string;
  familyId: string;
  childPatientId: string;
  affectedAdultPatientId: string;
  requestType: FamilyMedicalAccessRequestType;
  status: FamilyMedicalAccessRequestStatus;
  revision: number;
  reason: string;
  submittedAtUtc: string;
  rowVersion: string;
  reviewMessage: string | null;
  restrictionStatus: FamilyMedicalAccessStatusType;
  capabilities: FamilyMedicalCaseCapabilities;
  documents: FamilyMedicalDocument[];
}

export interface CreateFamilyMedicalAccessRequest {
  requestType: FamilyMedicalAccessRequestType;
  childPatientId: string;
  affectedAdultPatientId: string;
  reason: string;
  evidenceFiles: File[];
  documentTypes: string[];
  idempotencyKey: string;
}

export interface ResubmitFamilyMedicalAccessRequest {
  rowVersion: string;
  reason: string;
  evidenceFiles: File[];
  documentTypes: string[];
  idempotencyKey?: string;
}

export interface FamilyMedicalAccessRequestQuery {
  requestType?: FamilyMedicalAccessRequestType;
  status?: FamilyMedicalAccessRequestStatus;
  search?: string;
  familyId?: string;
  pageNumber: number;
  pageSize: number;
}

export interface FamilyMedicalHistoryItem {
  historyId: string;
  action: string;
  oldStatus: FamilyMedicalAccessRequestStatus | null;
  newStatus: FamilyMedicalAccessRequestStatus | null;
  revision: number;
  occurredAtUtc: string;
  message: string | null;
}

export interface FamilyMedicalPage<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}

export interface FamilyMedicalDecisionRequest {
  rowVersion: string;
  reason?: string;
  message?: string;
  idempotencyKey?: string;
}

export interface FamilyMedicalDependent {
  patientId: string;
  nameAr: string;
  nameEn: string | null;
  medicalAccess: FamilyMedicalAccessStatus;
}

export interface MedicalRecordFilter {
  types?: MedicalRecordResourceType[];
  fromDate?: string;
  toDate?: string;
  encounterId?: string;
  pageSize?: number;
  cursor?: string;
}

export interface MedicalRecordTimelineEntry {
  type: string;
  entryId: string;
  occurredAtUtc: string;
  sourceId: string;
  encounterId: string | null;
  resourceType: MedicalRecordResourceType | null;
  status: string;
  title: string;
  capabilities: { canViewDetails: boolean; canViewAttachments: boolean };
}

export interface MedicalRecordCursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FamilyMedicalRecordOverview {
  patient: {
    patientId: string;
    nameAr: string;
    nameEn: string | null;
    dateOfBirth: string;
    gender: 'Male' | 'Female';
  };
  context: Record<string, unknown>;
  summary: {
    completedVisitCount: number;
    currentPrescriptionCount: number;
    officialLabResultCount: number;
    officialRadiologyResultCount: number;
    hiddenEncounterCount: number;
  };
  timeline: MedicalRecordCursorPage<MedicalRecordTimelineEntry>;
  capabilities: { canView: boolean; canViewAttachments: boolean; canRequestHiddenAccess: boolean };
  availableFilters: string[];
}

export interface FamilyMedicalRecordEncounter {
  encounterId: string;
  visitDate: string;
  doctor: Record<string, unknown>;
  practice: Record<string, unknown>;
  diagnoses: Array<{ diagnosisId: string; type: string; displayText: string }>;
  outputs: MedicalRecordCursorPage<MedicalRecordTimelineEntry>;
  capabilities: Record<string, boolean>;
}

export interface FamilyMedicalRecordItem {
  resourceType: MedicalRecordResourceType;
  sourceId: string;
  encounterId: string;
  status: string;
  currentVersion: number;
  safeContent: Record<string, unknown>;
  attachments: Array<{
    attachmentId: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    canDownload: boolean;
  }>;
  capabilities: Record<string, boolean>;
}

export interface FamilyMedicalAccessSummary {
  totalCount?: number;
  pendingCount?: number;
  modificationRequestedCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  withdrawnCount?: number;
  restrictionCount?: number;
  restorationCount?: number;
  countsByStatus?: Record<string, number>;
  countsByType?: Record<string, number>;
  [key: string]: unknown;
}

export interface FamilyMedicalEligibilityReview {
  reviewId: string;
  eligibilityId?: string;
  familyId?: string;
  childPatientId?: string;
  affectedAdultPatientId?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Revoked' | string;
  eligibilityStatus?: string;
  reason?: string;
  reviewMessage?: string | null;
  reviewedByUserId?: string | null;
  reviewedAtUtc?: string | null;
  createdAtUtc?: string;
  rowVersion: string;
  capabilities?: {
    canApprove?: boolean;
    canReject?: boolean;
    canRevoke?: boolean;
  };
  [key: string]: unknown;
}

export interface FamilyMedicalEligibilityReviewQuery {
  status?: string;
  search?: string;
  pageNumber: number;
  pageSize: number;
}
