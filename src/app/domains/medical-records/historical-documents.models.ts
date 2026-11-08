export type HistoricalCategory =
  | 'HistoricalPrescription'
  | 'HistoricalLabReport'
  | 'HistoricalRadiologyReport'
  | 'SurgeryOrDischargeReport'
  | 'OtherMedicalDocument';
export type HistoricalState =
  'PendingValidation' | 'AvailableUnverified' | 'Quarantined' | 'RejectedUnsafe' | 'Withdrawn';
export interface HistoricalMetadata {
  category: HistoricalCategory;
  documentDate: string | null;
  dateUnknown: boolean;
  providerName: string | null;
  title: string | null;
  patientNote: string | null;
}
export interface HistoricalAttachment {
  attachmentId: string;
  fileName: string;
  contentType: string;
  length: number;
}
export interface HistoricalVersion {
  versionNumber: number;
  metadata: HistoricalMetadata;
  createdAtUtc: string;
  attachments: HistoricalAttachment[];
}
export interface HistoricalDocument {
  documentId: string;
  subjectPatientId: string;
  state: HistoricalState;
  currentVersionNumber: number;
  uploadedAtUtc: string;
  rowVersion: string;
  currentVersion: HistoricalVersion | null;
  canRevise: boolean;
  canWithdraw: boolean;
  source: 'PatientProvided';
  verificationStatus: 'Unverified';
}
export interface HistoricalReceipt {
  documentId: string;
  versionNumber: number;
  source: 'PatientProvided';
  verificationStatus: 'Unverified';
  validationState: 'AvailableUnverified' | 'RejectedUnsafe' | 'Quarantined';
  failureCode: string | null;
}
export interface HistoricalUpload extends HistoricalMetadata {
  files: readonly File[];
  rowVersion?: string;
  reason?: string;
}
export type HistoricalSubject = { kind: 'own' } | { kind: 'dependent'; patientId: string };
