export interface PrescriptionIdentity {
  readonly id: string;
  readonly nameAr: string;
  readonly nameEn: string | null;
}
export interface MedicationSubmission {
  medicationName: string;
  scientificName?: string | null;
  manufacturer?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  route?: string | null;
  drugClass?: string | null;
  doctorNote?: string | null;
}
export interface PrescriptionClinicalFields {
  strength: string | null;
  dosageForm: string | null;
  route: string | null;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  isPrn: boolean;
  quantity: number | null;
  instructions: string | null;
}
export type PrescriptionItemSource =
  | { drugCatalogId: string; newMedication?: never }
  | { newMedication: MedicationSubmission; drugCatalogId?: never };
export type AddPrescriptionItem = PrescriptionItemSource &
  PrescriptionClinicalFields & { prescriptionRowVersion?: string };
export interface PrescriptionItem extends PrescriptionClinicalFields {
  readonly itemId: string;
  readonly medicationName?: string;
  readonly commercialNameEn?: string;
  readonly commercialNameAr?: string | null;
  readonly drugCatalogId?: string | null;
}
export type PrescriptionVersionStatus = 'Draft' | 'Finalized' | 'Superseded' | 'Voided';
export interface PrescriptionVersion {
  readonly versionNumber: number;
  readonly status: PrescriptionVersionStatus;
  readonly previousVersionId?: string | null;
  readonly finalizedOnUtc?: string | null;
  readonly voidedOnUtc?: string | null;
  readonly reason?: string | null;
  readonly items: readonly PrescriptionItem[];
}
export interface PrescriptionState {
  readonly prescriptionId: string;
  readonly medicalEncounterId: string;
  readonly practiceId: string;
  readonly rowVersion: string;
  readonly current: PrescriptionVersion | null;
  readonly draft: PrescriptionVersion | null;
  readonly capabilities: {
    readonly canManageDraft?: boolean;
    readonly canCorrect?: boolean;
    readonly canVoid?: boolean;
    readonly canFinalizeCorrection?: boolean;
    readonly canDiscardCorrection?: boolean;
  };
  readonly completionBlockers: readonly {
    readonly code: string;
    readonly message: string;
    readonly itemId?: string | null;
    readonly field?: string | null;
  }[];
}
export interface PatientPrescription {
  readonly prescriptionId: string;
  readonly doctor: PrescriptionIdentity;
  readonly practice: PrescriptionIdentity;
  readonly visitDateUtc: string;
  readonly versionNumber: number;
  readonly status: 'Finalized' | 'Voided';
  readonly finalizedOnUtc?: string | null;
  readonly voidedOnUtc?: string | null;
  readonly items: readonly (PrescriptionClinicalFields & {
    readonly medicationName?: string;
    readonly commercialNameEn?: string;
    readonly commercialNameAr?: string | null;
  })[];
}
export interface PatientPrescriptionPage {
  readonly items: readonly PatientPrescription[];
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}
