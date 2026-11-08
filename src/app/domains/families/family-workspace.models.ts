import { Gender } from '../../core/auth/auth.models';
import { PatientContact } from '../patients';
import { Family, FamilyRequestSummary } from './family.models';

export type ParentRole = 'Father' | 'Mother';
export interface FamilyWorkspaceChild {
  patientId: string;
  nameAr: string;
  canBook: boolean;
  canViewReservations: boolean;
  canCancelReservation: boolean;
  canRescheduleReservation: boolean;
  canViewQueue: boolean;
  canViewTicket: boolean;
  canViewMedicalRecord: boolean;
  canViewProfile: boolean;
  canManageContacts: boolean;
  canManagePhoto: boolean;
  canUploadHistoricalDocument: boolean;
  canViewHistoricalDocuments: boolean;
  canViewReceipts: boolean;
  canViewTransactions: boolean;
  canRequestVerification: boolean;
  canCorrectIdentity: boolean;
  canRequestIdentityCorrection: boolean;
  canSubmitDoctorOrderedDiagnostic: boolean;
  canSubmitLabResult: boolean;
  canSubmitRadiologyResult: boolean;
  canViewDiagnosticSubmissions: boolean;
  canWithdrawDiagnosticSubmission: boolean;
  canViewLabSubmissions: boolean;
  canViewRadiologySubmissions: boolean;
  canWithdrawLabSubmission: boolean;
  canWithdrawRadiologySubmission: boolean;
  operationalReasonCode: string | null;
  medicalReasonCode: string | null;
  capabilityReasons: Readonly<Record<string, string | null>> | null;
}
export interface FamilyPendingWorkflow {
  kind: string;
  reference: string;
  status: string;
  nextAction: string;
  createdAtUtc: string;
}
export interface FamilyWorkspace {
  hasFamily: boolean;
  family: Family | null;
  dependents: FamilyWorkspaceChild[];
  pendingRequests: FamilyRequestSummary[];
  canStartExistingChildLink: boolean;
  canStartChildOnboarding: boolean;
  canJoinExistingFamily: boolean;
  pendingWorkflows: FamilyPendingWorkflow[] | null;
}
export interface FamilyCandidateSearch {
  nameAr: string;
  dateOfBirth: string;
  gender: Gender;
  phoneNumber: string | null;
}
export interface FamilyCandidate {
  candidateReference: string;
  displayNameMasked: string;
  birthYear: number;
  expiresAtUtc: string;
}
export interface FamilyCandidateSearchResponse {
  searchStatus: string;
  candidates: FamilyCandidate[];
  hasMore: boolean;
  nextAction: string;
}
export interface FamilySubmissionReceipt {
  requestId: string | null;
  status: string;
  conflictCaseId: string | null;
  nextAction: string;
}
export interface FamilyEvidence {
  evidenceFiles: readonly File[];
  documentTypes: readonly string[];
}
export interface ChildIntake extends FamilyCandidateSearch {
  nameEn: string | null;
  primaryContactNameAr: string | null;
  primaryContactPhone: string | null;
  relationToChild: ParentRole;
}
export interface ChildOnboardingReceipt {
  requestId: string;
  status: string;
  revision: number;
  createdAtUtc: string;
  rowVersion: string;
  reviewMessage: string | null;
  canResubmit: boolean;
  approvedPatientId: string | null;
  familyRelationshipRequestId: string | null;
  conflictCaseId: string | null;
  nextAction: string | null;
}
export interface ChildOnboardingReview {
  request: ChildOnboardingReceipt;
  intake: ChildIntake;
  evidence: FamilyEvidenceDocument[];
  possibleMatches: (Pick<FamilyCandidateSearch, 'nameAr' | 'dateOfBirth' | 'gender'> & {
    patientId: string;
    nameEn: string | null;
  })[];
  hasMorePossibleMatches: boolean;
  possibleMatchPageNumber: number;
}
export interface DependentProfile {
  patientId: string;
  nameAr: string;
  nameEn: string | null;
  dateOfBirth: string;
  gender: Gender;
  phoneNumber: string | null;
  hasProfileImage: boolean;
  rowVersion: string;
  contacts: PatientContact[];
}
export interface DependentProfileChange {
  changeId: string;
  contactId: string | null;
}
export interface DependentTicket {
  ticketId: string;
  ticketNumber: number;
  status: string;
  businessDate: string;
  practiceNameAr: string;
  practiceNameEn: string | null;
  doctorNameAr: string;
  doctorNameEn: string | null;
  patientsAheadNow: number;
  lastUpdatedOnUtc: string;
  isArchived: boolean;
  archivedAtUtc: string | null;
  patientsAheadNowIsCurrent: boolean;
}
export interface DependentActiveTicket extends Omit<
  DependentTicket,
  'businessDate' | 'isArchived' | 'archivedAtUtc' | 'patientsAheadNowIsCurrent'
> {
  doctorPracticeId: string;
  doctorId: string;
}
export interface OperationalAuthority {
  authorityId: string;
  familyId: string;
  parentPatientId: string;
  childPatientId: string;
  isActive: boolean;
  approvedRelationshipRequestId: string;
  approvedRevisionNumber: number;
  rowVersion: string;
}
export interface FamilyGovernanceReceipt {
  caseId: string;
  kind: string;
  status: string;
  revision: number;
  rowVersion: string;
  nextAction: string;
}
export interface FamilyGovernanceDetails {
  request: FamilyGovernanceReceipt;
  createdAtUtc: string;
  feedback: string | null;
  revisions: {
    revision: number;
    beforeSnapshot: string;
    afterSnapshot: string;
    reason: string;
    createdAtUtc: string;
  }[];
  evidence: FamilyEvidenceDocument[];
  history: {
    revision: number;
    actorUserId: string;
    action: string;
    reason: string | null;
    occurredAtUtc: string;
  }[];
}
export interface FamilyGovernancePage {
  items: FamilyGovernanceDetails[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}
export interface FamilyInvitation {
  invitationReference: string;
  expiresAtUtc: string;
  nextAction: string;
}
export interface DependentDiagnosticReceipt {
  submissionId: string;
  requestId: string;
  status: string;
  rowVersion: string;
}
export interface FamilyEvidenceDocument {
  documentId: string;
  revisionNumber: number;
  documentType: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  uploadedOnUtc: string;
}
