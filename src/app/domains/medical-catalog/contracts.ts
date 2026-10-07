// Generated from the deployed Phase 15 OpenAPI schema.
export type CatalogPresentation = {
  readonly displayNameEn: string | null;
  readonly displayNameAr: string | null;
  readonly aliasesEn: string | null;
  readonly aliasesAr: string | null;
  readonly internalNote: string | null;
};
export type CreateMedicalCatalogManagerCommand = {
  readonly userName: string | null;
  readonly email: string | null;
  readonly phoneNumber: string | null;
  readonly initialPassword: string | null;
  readonly confirmPassword: string | null;
};
export type DiagnosticImportApplyRequest = {
  readonly rowVersion: string | null;
  readonly skipPossibleConflicts: boolean;
};
export type DiagnosticImportBatchResponse = {
  readonly batchId: string;
  readonly sourceVersion: string | null;
  readonly originalFileName: string | null;
  readonly fileSha256: string | null;
  readonly uploadedByUserId: string;
  readonly uploadedAtUtc: string;
  readonly status: DiagnosticImportStatus;
  readonly totalRecords: number;
  readonly counts: {
    readonly New: number;
    readonly Unchanged: number;
    readonly Changed: number;
    readonly ArabicAdded: number;
    readonly ArabicChanged: number;
    readonly ExternalStatusChanged: number;
    readonly PossibleConflict: number;
    readonly Skipped: number;
  } | null;
  readonly appliedByUserId: string | null;
  readonly appliedAtUtc: string | null;
  readonly rowVersion: string | null;
  readonly capabilities: DiagnosticImportCapabilities;
};
export type DiagnosticImportStatus = 'Staged' | 'Applied' | 'Discarded';
export type DiagnosticImportCapabilities = {
  readonly canApply: boolean;
  readonly canDiscard: boolean;
};
export type DiagnosticImportBatchResponseClinicalPage = {
  readonly items: readonly DiagnosticImportBatchResponse[] | null;
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
};
export type DiagnosticImportDisposition =
  | 'New'
  | 'Unchanged'
  | 'Changed'
  | 'ArabicAdded'
  | 'ArabicChanged'
  | 'ExternalStatusChanged'
  | 'PossibleConflict'
  | 'Skipped';
export type DiagnosticImportRecordResponse = {
  readonly recordId: string;
  readonly loincCode: string | null;
  readonly nameEn: string | null;
  readonly disposition: DiagnosticImportDisposition;
  readonly sourceDataJson: string | null;
  readonly matchedCatalogId: string | null;
};
export type DiagnosticImportRecordResponseClinicalPage = {
  readonly items: readonly DiagnosticImportRecordResponse[] | null;
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
};
export type LabCatalogRequestUpdateRequest = {
  readonly data: LabMissingTestRequest;
  readonly rowVersion: string | null;
};
export type LabMissingTestRequest = {
  readonly testName: string | null;
  readonly specimen: string | null;
  readonly catalogClarificationNote: string | null;
};
export type ManagerContactRequest = {
  readonly email: string | null;
  readonly phoneNumber: string | null;
};
export type MedicalCatalogManagerResponse = {
  readonly id: string;
  readonly userName: string | null;
  readonly email: string | null;
  readonly phoneNumber: string | null;
  readonly isActive: boolean;
  readonly isFirstLogin: boolean;
  readonly createdOnUtc: string;
};
export type MedicalCatalogManagerResponseClinicalPage = {
  readonly items: readonly MedicalCatalogManagerResponse[] | null;
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
};
export type MedicalCatalogRequestResponse = {
  readonly requestId: string;
  readonly requestedByDoctorId: string;
  readonly name: string | null;
  readonly specimen: string | null;
  readonly catalogClarificationNote: string | null;
  readonly status: MedicalCatalogRequestStatus;
  readonly canonicalCatalogId: string | null;
  readonly reasonType: string | null;
  readonly reviewReason: string | null;
  readonly createdAtUtc: string;
  readonly rowVersion: string | null;
  readonly capabilities: CatalogRequestCapabilities;
  readonly history: readonly DiagnosticHistoryResponse[] | null;
  readonly canonicalCatalog: MedicalCatalogResponse;
};
export type MedicalCatalogRequestStatus = 'Pending' | 'NeedsMoreInfo' | 'Approved' | 'Rejected';
export type CatalogRequestCapabilities = {
  readonly canEdit: boolean;
  readonly canRequestMoreInfo: boolean;
  readonly canApprove: boolean;
  readonly canReject: boolean;
};
export type DiagnosticHistoryResponse = {
  readonly id: string;
  readonly action: string | null;
  readonly reason: string | null;
  readonly beforeSnapshot: string | null;
  readonly afterSnapshot: string | null;
  readonly actorUserId: string;
  readonly actorType: string | null;
  readonly occurredAtUtc: string;
};
export type MedicalCatalogResponse = {
  readonly catalogId: string;
  readonly source: MedicalCatalogSource;
  readonly status: MedicalCatalogStatus;
  readonly loincCode: string | null;
  readonly nameEn: string | null;
  readonly nameAr: string | null;
  readonly officialNameEn: string | null;
  readonly officialNameAr: string | null;
  readonly externalStatus: string | null;
  readonly sourceVersion: string | null;
  readonly isCommonOrder: boolean;
  readonly presentation: CatalogPresentation;
  readonly sourceDataJson: string | null;
  readonly attributesJson: string | null;
  readonly mergedIntoId: string | null;
  readonly rowVersion: string | null;
  readonly capabilities: CatalogCapabilities;
  readonly history: readonly DiagnosticHistoryResponse[] | null;
};
export type MedicalCatalogSource = 'Loinc' | 'Wasla';
export type MedicalCatalogStatus = 'Active' | 'Inactive' | 'Merged';
export type CatalogCapabilities = {
  readonly canEdit: boolean;
  readonly canActivate: boolean;
  readonly canDeactivate: boolean;
  readonly canMerge: boolean;
};
export type MedicalCatalogRequestResponseClinicalPage = {
  readonly items: readonly MedicalCatalogRequestResponse[] | null;
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
};
export type MedicalCatalogResponseClinicalPage = {
  readonly items: readonly MedicalCatalogResponse[] | null;
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
};
export type MedicalCatalogUpdateRequest = {
  readonly data: CatalogPresentation;
  readonly rowVersion: string | null;
};
export type MedicalRequestReviewRequest = {
  readonly rowVersion: string | null;
  readonly reason: string | null;
  readonly canonicalCatalogId: string | null;
  readonly approvedData: CatalogPresentation;
};
export type RadiologyCatalogRequestUpdateRequest = {
  readonly data: RadiologyMissingTestRequest;
  readonly rowVersion: string | null;
};
export type RadiologyMissingTestRequest = {
  readonly procedureName: string | null;
  readonly specimen: string | null;
  readonly catalogClarificationNote: string | null;
};
export type DiagnosticActionRequest = {
  readonly rowVersion: string | null;
  readonly reason: string | null;
  readonly targetCatalogId: string | null;
};
