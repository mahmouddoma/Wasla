export interface PatientMedicalRecordOverview {
  readonly patientId: string;
  readonly name: string;
  readonly visitsCount: number;
  readonly diagnosesCount: number;
  readonly prescriptionsCount: number;
  readonly labOrdersCount: number;
  readonly radiologyOrdersCount: number;
  readonly availableFilters: readonly string[];
  readonly safeMode: boolean;
}

export interface MedicalRecordTimelineEntry {
  readonly id: string;
  readonly itemType: 'Encounter' | 'Diagnosis' | 'Prescription' | 'LabOrder' | 'RadiologyOrder';
  readonly title: string;
  readonly dateUtc: string;
  readonly summary: string;
  readonly doctorName: string;
  readonly specialization: string;
  readonly isHidden: boolean;
  readonly hiddenPlaceholderMessage?: string;
  readonly hiddenPlaceholderToken?: string;
  readonly sourceEncounterId?: string;
  readonly sourceItemId?: string;
}

export interface MedicalRecordTimelinePage {
  readonly items: readonly MedicalRecordTimelineEntry[];
  readonly nextCursor?: string | null;
  readonly hasMore: boolean;
}

export interface MedicalRecordDiagnosisItem {
  readonly code: string;
  readonly description: string;
  readonly status: string;
}

export interface MedicalRecordPrescriptionSummary {
  readonly prescriptionId: string;
  readonly drugName: string;
  readonly dosage: string;
}

export interface MedicalRecordLabSummary {
  readonly orderId: string;
  readonly testName: string;
  readonly status: string;
}

export interface MedicalRecordRadiologySummary {
  readonly orderId: string;
  readonly procedureName: string;
  readonly status: string;
}

export interface MedicalRecordEncounterDetail {
  readonly encounterId: string;
  readonly dateUtc: string;
  readonly doctorName: string;
  readonly practiceName: string;
  readonly clinicalNotes?: string;
  readonly diagnoses: readonly MedicalRecordDiagnosisItem[];
  readonly prescriptions: readonly MedicalRecordPrescriptionSummary[];
  readonly labOrders: readonly MedicalRecordLabSummary[];
  readonly radiologyOrders: readonly MedicalRecordRadiologySummary[];
  readonly visibility: 'Visible' | 'Hidden';
  readonly rowVersion: string;
}

export interface MedicalRecordAttachmentSummary {
  readonly attachmentId: string;
  readonly fileName: string;
  readonly contentType: string;
  readonly sizeBytes: number;
}

export interface MedicalRecordItemDetail {
  readonly resourceType: string;
  readonly sourceId: string;
  readonly title: string;
  readonly dateUtc: string;
  readonly status: string;
  readonly doctorName: string;
  readonly details: Readonly<Record<string, unknown>>;
  readonly attachments: readonly MedicalRecordAttachmentSummary[];
}

export interface MedicalRecordAccessLogEntry {
  readonly id: string;
  readonly actorName: string;
  readonly actorRole: string;
  readonly action: string;
  readonly resource: string;
  readonly timestampUtc: string;
  readonly ticketId?: string;
}

export interface MedicalRecordAccessLogPage {
  readonly items: readonly MedicalRecordAccessLogEntry[];
  readonly nextCursor?: string | null;
  readonly hasMore: boolean;
}

export interface TreatingDoctorMedicalOverview {
  readonly patientId: string;
  readonly patientName: string;
  readonly ticketId: string;
  readonly encounterId: string;
  readonly visitsCount: number;
  readonly diagnosesCount: number;
  readonly prescriptionsCount: number;
  readonly labOrdersCount: number;
  readonly radiologyOrdersCount: number;
  readonly hiddenEncountersCount: number;
}

export interface HiddenAccessRequestItem {
  readonly requestId: string;
  readonly sourceEncounterId: string;
  readonly visitDateUtc: string;
  readonly status: 'Pending' | 'Approved' | 'Rejected' | 'Revoked' | 'Expired';
  readonly requestedAtUtc: string;
  readonly decidedAtUtc?: string | null;
  readonly reason?: string;
  readonly rowVersion: string;
}

export interface HiddenAccessRequestSummaryPage {
  readonly items: readonly HiddenAccessRequestItem[];
}

export interface CreateHiddenAccessRequest {
  readonly hiddenEncounterPlaceholderToken: string;
  readonly reason: string;
}

export interface AccessInboxSummaryResponse {
  readonly pendingCount: number;
}

export interface OwnerAccessRequestItem {
  readonly requestId: string;
  readonly requesterDoctorName: string;
  readonly requesterPracticeName: string;
  readonly patientNameMasked: string;
  readonly encounterDateUtc: string;
  readonly status: string;
  readonly reason: string;
  readonly requestedAtUtc: string;
  readonly rowVersion: string;
  readonly canApprove: boolean;
  readonly canReject: boolean;
  readonly canRevoke: boolean;
}

export interface OwnerAccessRequestPage {
  readonly items: readonly OwnerAccessRequestItem[];
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

export interface ApproveHiddenAccessRequest {
  readonly rowVersion: string;
  readonly note?: string;
}

export interface RejectHiddenAccessRequest {
  readonly rowVersion: string;
  readonly reason: string;
}

export interface RevokeHiddenAccessRequest {
  readonly rowVersion: string;
  readonly reason: string;
}

export interface AccessRequestHistoryItem {
  readonly id: string;
  readonly action: string;
  readonly actorName: string;
  readonly timestampUtc: string;
  readonly note?: string;
}

export interface UpdateEncounterVisibilityRequest {
  readonly visibility: 'Visible' | 'Hidden';
  readonly reason: string;
  readonly rowVersion: string;
}

export interface UpdateEncounterVisibilityResponse {
  readonly encounterId: string;
  readonly visibility: 'Visible' | 'Hidden';
  readonly rowVersion: string;
}

export interface VisibilityHistoryItem {
  readonly id: string;
  readonly previousVisibility: string;
  readonly newVisibility: string;
  readonly changedByDoctorName: string;
  readonly changedAtUtc: string;
  readonly reason: string;
}
