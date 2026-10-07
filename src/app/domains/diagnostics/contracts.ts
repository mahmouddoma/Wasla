// Generated from the deployed Phase 15 OpenAPI schema.
import type { LabMissingTestRequest, RadiologyMissingTestRequest } from '../medical-catalog';
export type DiagnosticRequestStateResponse = {
  readonly requestId: string | null;
  readonly medicalEncounterId: string;
  readonly doctor: ClinicalPartyResponse;
  readonly practice: ClinicalPartyResponse;
  readonly origin: DiagnosticOrigin;
  readonly status: DiagnosticRequestStatus;
  readonly patientInstructions: string | null;
  readonly requestedAtUtc: string | null;
  readonly rowVersion: string | null;
  readonly items: readonly DiagnosticItemResponse[] | null;
  readonly capabilities: DiagnosticOrderCapabilities;
  readonly currentResults: readonly DiagnosticResultResponse[] | null;
  readonly submissions: readonly DiagnosticSubmissionSummary[] | null;
  readonly postVisitReason: string | null;
};
export type ClinicalPartyResponse = {
  readonly id: string;
  readonly nameAr: string | null;
  readonly nameEn: string | null;
};
export type DiagnosticOrigin = 'DuringEncounter' | 'PostVisit';
export type DiagnosticRequestStatus =
  'Draft' | 'Requested' | 'PartiallyCompleted' | 'Completed' | 'Cancelled';
export type DiagnosticItemResponse = {
  readonly itemId: string;
  readonly nameArSnapshot: string | null;
  readonly nameEnSnapshot: string | null;
  readonly loincCodeSnapshot: string | null;
  readonly modalitySnapshot: string | null;
  readonly anatomicLocationSnapshot: string | null;
  readonly lateralitySnapshot: string | null;
  readonly doctorInstructions: string | null;
  readonly status: DiagnosticItemStatus;
  readonly cancellationReason: string | null;
  readonly capabilities: DiagnosticItemCapabilities;
  readonly catalogId: string | null;
  readonly catalogRequestId: string | null;
};
export type DiagnosticItemStatus = 'Requested' | 'Completed' | 'Cancelled';
export type DiagnosticItemCapabilities = {
  readonly canEdit: boolean;
  readonly canRemove: boolean;
  readonly canCancel: boolean;
  readonly hasCurrentResult: boolean;
};
export type DiagnosticOrderCapabilities = {
  readonly canManageDraft: boolean;
  readonly canCancelRemaining: boolean;
  readonly canUploadResult: boolean;
};
export type DiagnosticResultResponse = {
  readonly resultId: string;
  readonly requestId: string;
  readonly currentVersionNumber: number;
  readonly current: DiagnosticVersionResponse;
  readonly rowVersion: string | null;
  readonly capabilities: DiagnosticResultCapabilities;
};
export type DiagnosticVersionResponse = {
  readonly versionId: string;
  readonly versionNumber: number;
  readonly status: DiagnosticVersionStatus;
  readonly externalProviderName: string | null;
  readonly externalReportDate: string | null;
  readonly originallyUploadedBy: DiagnosticUploader;
  readonly originallyUploadedAtUtc: string;
  readonly reviewedByDoctorId: string;
  readonly reviewedAtUtc: string;
  readonly coveredItemIds: readonly string[] | null;
  readonly attachments: readonly DiagnosticAttachmentResponse[] | null;
  readonly correctionReason: string | null;
  readonly voidReason: string | null;
};
export type DiagnosticVersionStatus = 'Finalized' | 'Superseded' | 'Voided';
export type DiagnosticUploader = 'Doctor' | 'Patient';
export type DiagnosticAttachmentResponse = {
  readonly attachmentId: string;
  readonly originalFileName: string | null;
  readonly contentType: string | null;
  readonly sizeBytes: number;
  readonly sha256: string | null;
  readonly uploadedAtUtc: string;
  readonly kind: DiagnosticAttachmentKind;
};
export type DiagnosticAttachmentKind = 'Report' | 'Image';
export type DiagnosticResultCapabilities = {
  readonly canCorrect: boolean;
  readonly canVoid: boolean;
};
export type DiagnosticSubmissionSummary = {
  readonly submissionId: string;
  readonly requestId: string;
  readonly status: PatientSubmissionStatus;
  readonly submittedAtUtc: string;
};
export type PatientSubmissionStatus =
  'PendingReview' | 'Accepted' | 'Rejected' | 'Withdrawn' | 'NoLongerApplicable';
export type DiagnosticRequestSummaryClinicalPage = {
  readonly items: readonly DiagnosticRequestSummary[] | null;
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
};
export type DiagnosticRequestSummary = {
  readonly requestId: string;
  readonly medicalEncounterId: string;
  readonly patientId: string;
  readonly practiceId: string;
  readonly origin: DiagnosticOrigin;
  readonly status: DiagnosticRequestStatus;
  readonly requestedAtUtc: string | null;
  readonly rowVersion: string | null;
};
export type DiagnosticResultMutationResponse = {
  readonly submission: DiagnosticSubmissionResponse | null;
  readonly result: DiagnosticResultResponse | null;
  readonly request: DiagnosticRequestStateResponse | null;
};
export type DiagnosticSubmissionResponse = {
  readonly submissionId: string;
  readonly requestId: string;
  readonly status: PatientSubmissionStatus;
  readonly externalProviderName: string | null;
  readonly externalReportDate: string | null;
  readonly patientNote: string | null;
  readonly patientVisibleReason: string | null;
  readonly acceptedResultId: string | null;
  readonly submittedAtUtc: string;
  readonly rowVersion: string | null;
  readonly attachments: readonly DiagnosticAttachmentResponse[] | null;
  readonly capabilities: DiagnosticSubmissionCapabilities;
};
export type DiagnosticSubmissionCapabilities = {
  readonly canWithdraw: boolean;
  readonly canAccept: boolean;
  readonly canReject: boolean;
};
export type DiagnosticResultResponseClinicalPage = {
  readonly items: readonly DiagnosticResultResponse[] | null;
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
};
export type DiagnosticSubmissionSummaryClinicalPage = {
  readonly items: readonly DiagnosticSubmissionSummary[] | null;
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
};
export type LabAddItemRequest = {
  readonly labTestCatalogId: string | null;
  readonly newLabTest: LabMissingTestRequest | null;
  readonly doctorInstructions: string | null;
  readonly labRequestRowVersion: string | null;
  readonly patientInstructions: string | null;
};
export type RadiologyAddItemRequest = {
  readonly radiologyProcedureCatalogId: string | null;
  readonly newRadiologyProcedure: RadiologyMissingTestRequest | null;
  readonly doctorInstructions: string | null;
  readonly radiologyRequestRowVersion: string | null;
  readonly patientInstructions: string | null;
};
export type LabPostVisitRequest = {
  readonly postVisitReason: string | null;
  readonly items: readonly LabOrderItemRequest[] | null;
  readonly patientInstructions: string | null;
};
export type LabOrderItemRequest = {
  readonly labTestCatalogId: string | null;
  readonly newLabTest: LabMissingTestRequest | null;
  readonly doctorInstructions: string | null;
};
export type RadiologyPostVisitRequest = {
  readonly postVisitReason: string | null;
  readonly items: readonly RadiologyOrderItemRequest[] | null;
  readonly patientInstructions: string | null;
};
export type RadiologyOrderItemRequest = {
  readonly radiologyProcedureCatalogId: string | null;
  readonly newRadiologyProcedure: RadiologyMissingTestRequest | null;
  readonly doctorInstructions: string | null;
};
export type LabAcceptSubmissionRequest = {
  readonly coveredLabRequestItemIds: readonly string[] | null;
  readonly rowVersion: string | null;
};
export type RadiologyAcceptSubmissionRequest = {
  readonly coveredRadiologyRequestItemIds: readonly string[] | null;
  readonly rowVersion: string | null;
};
export type DiagnosticRejectSubmissionRequest = {
  readonly patientVisibleReason: string | null;
  readonly rowVersion: string | null;
};
