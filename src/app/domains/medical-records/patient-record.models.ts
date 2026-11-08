import { HistoricalCategory } from './historical-documents.models';

export interface ClinicalRecordEntry {
  type: string;
  entryId: string;
  occurredAtUtc: string;
  sourceId: string;
  encounterId: string;
  resourceType: string;
  status: string;
  title: string;
  capabilities: { canViewDetails: boolean; canViewAttachments: boolean };
}
export interface HistoricalRecordEntry {
  type: 'HistoricalPatientDocument';
  entryId: string;
  documentId: string;
  occurredAtUtc: string;
  category: HistoricalCategory;
  documentDate: string | null;
  dateUnknown: boolean;
  source: 'PatientProvided';
  verificationStatus: 'Unverified';
}
export interface HiddenRecordEntry {
  type: 'HiddenEncounterPlaceholder';
  entryId: string;
  visitDate: string;
  isHidden: boolean;
  hiddenEncounterToken: string;
  accessRequest: { status: string; requestId: string | null };
  capabilities: { canRequestAccess: boolean };
}
export type SafeRecordEntry = ClinicalRecordEntry | HistoricalRecordEntry | HiddenRecordEntry;
export interface SafeRecordPage {
  items: SafeRecordEntry[];
  nextCursor: string | null;
  hasMore: boolean;
}
export interface SafeRecordOverview {
  patient: {
    patientId: string;
    nameAr: string;
    nameEn: string | null;
    dateOfBirth: string;
    gender: 'Male' | 'Female';
  };
  context: {
    mode: string;
    ticketId: string | null;
    treatingEncounterId: string | null;
    treatmentStatus: string | null;
  };
  summary: {
    completedVisitCount: number;
    currentPrescriptionCount: number;
    officialLabResultCount: number;
    officialRadiologyResultCount: number;
    hiddenEncounterCount: number;
  };
  timeline: SafeRecordPage;
  capabilities: { canView: boolean; canViewAttachments: boolean; canRequestHiddenAccess: boolean };
  availableFilters: string[];
}
export function isClinicalRecordEntry(entry: SafeRecordEntry): entry is ClinicalRecordEntry {
  return entry.type !== 'HistoricalPatientDocument' && entry.type !== 'HiddenEncounterPlaceholder';
}
export function isHistoricalRecordEntry(entry: SafeRecordEntry): entry is HistoricalRecordEntry {
  return entry.type === 'HistoricalPatientDocument';
}
