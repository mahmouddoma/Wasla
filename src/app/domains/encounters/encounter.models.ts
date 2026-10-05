export interface ClinicalIdentity {
  readonly id: string;
  readonly nameAr: string;
  readonly nameEn: string | null;
}
export type EncounterStatus = 'InProgress' | 'Completed';
export type DiagnosisType = 'Primary' | 'Secondary';
export interface Diagnosis {
  readonly diagnosisId: string;
  readonly type: DiagnosisType;
  readonly displayText: string;
  readonly notes: string | null;
  readonly isVoided?: boolean;
}
export interface EncounterSummary {
  readonly encounterId: string;
  readonly ticketId: string;
  readonly patient: ClinicalIdentity;
  readonly doctor: ClinicalIdentity;
  readonly practice: ClinicalIdentity;
  readonly visitType?: ClinicalIdentity;
  readonly status: EncounterStatus;
  readonly startedOnUtc: string;
  readonly completedOnUtc: string | null;
  readonly hasDiagnosis: boolean;
  readonly hasFollowUpEligibility: boolean;
  readonly rowVersion: string;
}
export interface PatientEncounterDetails {
  readonly encounterId: string;
  readonly doctor: ClinicalIdentity;
  readonly practice: ClinicalIdentity;
  readonly startedOnUtc: string;
  readonly completedOnUtc: string;
  readonly diagnoses: readonly Diagnosis[];
  readonly followUpEligibility?: {
    readonly eligibilityId: string;
    readonly validUntil: string;
    readonly status: string;
  } | null;
}
export interface EncounterDetails extends EncounterSummary {
  readonly clinicalNotes: string;
  readonly diagnoses: readonly Diagnosis[];
  readonly followUpEligibility?: {
    readonly eligibilityId: string;
    readonly validUntil: string;
    readonly status: string;
  } | null;
  readonly capabilities: {
    readonly canEditClinicalNotes: boolean;
    readonly canManageDiagnoses: boolean;
    readonly canComplete: boolean;
    readonly canAmend: boolean;
    readonly canCreateFollowUpEligibility: boolean;
  };
}
export interface EncounterQuery {
  patientId?: string;
  status?: EncounterStatus;
  fromDate?: string;
  toDate?: string;
  search?: string;
  pageNumber: number;
  pageSize: number;
}
export interface EncounterPage {
  readonly items: readonly EncounterSummary[];
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}
export interface DiagnosisDraft {
  readonly type: DiagnosisType;
  readonly displayText: string;
  readonly notes: string | null;
}
/** Read-only server snapshots. The write contract is intentionally separate. */
export interface EncounterAmendment {
  readonly sequence: number;
  readonly reason: string;
  readonly author: string;
  readonly createdOnUtc: string;
  readonly changes: readonly {
    readonly type: string;
    readonly before: unknown;
    readonly after: unknown;
  }[];
}

export type AmendmentChangeType = 'ClinicalNotes' | 'Diagnosis';
export type AmendmentDiagnosisAction = 'Add' | 'Update' | 'Remove';

export interface ClinicalNotesAmendmentChange {
  readonly type: 'ClinicalNotes';
  readonly clinicalNotes: string;
}

export interface DiagnosisAmendmentChange {
  readonly type: 'Diagnosis';
  readonly action: AmendmentDiagnosisAction;
  readonly diagnosisId?: string;
  readonly diagnosisType?: DiagnosisType;
  readonly displayText?: string;
  readonly notes?: string | null;
  readonly diagnosis?: DiagnosisDraft;
}

export type EncounterAmendmentChange =
  | ClinicalNotesAmendmentChange
  | DiagnosisAmendmentChange;

export interface CreateEncounterAmendmentRequest {
  readonly reason: string;
  readonly encounterRowVersion: string;
  readonly changes: readonly EncounterAmendmentChange[];
}

