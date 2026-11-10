/** Published Phase 16 shared-record transport contracts, refreshed from live OpenAPI 2026-11-09. */
export interface SharedRecordSchemas {
  AccessDecisionRequest: { rowVersion: string | null };
  AccessInboxSummary: {
    pendingCount: number;
    actionableCount: number;
    approvedActiveCount: number;
  };
  ClinicalPartyResponse: { id: string; nameAr: string | null; nameEn: string | null };
  ClinicalTimelineEntry: {
    type: string | null;
    entryId: string | null;
    occurredAtUtc: string;
    sourceId: string;
    encounterId: string;
    resourceType: string | null;
    status: string | null;
    title: string | null;
    capabilities: SharedRecordSchemas['TimelineCapabilities'];
  };
  DoctorSharedMedicalRecordEncounterResponse: {
    encounterId: string;
    visitDate: string;
    doctor: SharedRecordSchemas['ClinicalPartyResponse'];
    practice: SharedRecordSchemas['ClinicalPartyResponse'];
    diagnoses: ReadonlyArray<SharedRecordSchemas['SafeDiagnosis']> | null;
    outputs: SharedRecordSchemas['TimelineEntryRecordPage'];
    capabilities: SharedRecordSchemas['RecordCapabilities'];
    prescription: SharedRecordSchemas['ClinicalTimelineEntry'];
    labRequests: ReadonlyArray<SharedRecordSchemas['ClinicalTimelineEntry']> | null;
    labResults: ReadonlyArray<SharedRecordSchemas['ClinicalTimelineEntry']> | null;
    radiologyRequests: ReadonlyArray<SharedRecordSchemas['ClinicalTimelineEntry']> | null;
    radiologyResults: ReadonlyArray<SharedRecordSchemas['ClinicalTimelineEntry']> | null;
  };
  DoctorSharedMedicalRecordItemResponse: {
    resourceType: string | null;
    sourceId: string;
    encounterId: string;
    status: string | null;
    currentVersion: number | null;
    safeContent:
      | SharedRecordSchemas['SafePrescriptionContent']
      | SharedRecordSchemas['SafeOrderContent']
      | SharedRecordSchemas['SafeResultContent'];
    attachments: ReadonlyArray<SharedRecordSchemas['RecordAttachment']> | null;
    capabilities: SharedRecordSchemas['RecordCapabilities'];
  };
  DoctorSharedMedicalRecordOverviewResponse: {
    patient: SharedRecordSchemas['MedicalRecordPatient'];
    context: SharedRecordSchemas['RecordContext'];
    summary: SharedRecordSchemas['RecordSummary'];
    timeline: SharedRecordSchemas['TimelineEntryRecordPage'];
    capabilities: SharedRecordSchemas['RecordCapabilities'];
    availableFilters: ReadonlyArray<string> | null;
  };
  EncounterVisibility: 'Visible' | 'Hidden';
  EncounterVisibilityResponse: {
    encounterId: string;
    visibility: SharedRecordSchemas['EncounterVisibility'];
    visibilityRevision: number;
    rowVersion: string | null;
    capabilities: SharedRecordSchemas['VisibilityCapabilities'];
  };
  Gender: 'Male' | 'Female';
  HiddenAccessCreateRequest: { hiddenEncounterToken: string | null; reason: string | null };
  HiddenAccessRequestStatus: 'Pending' | 'Approved' | 'Rejected' | 'Revoked' | 'Expired';
  HiddenAccessResponse: {
    requestId: string;
    status: SharedRecordSchemas['HiddenAccessRequestStatus'];
    effectiveStatus: SharedRecordSchemas['HiddenAccessRequestStatus'];
    reason: string | null;
    requestedAtUtc: string;
    decidedAtUtc: string | null;
    revokedAtUtc: string | null;
    expiresWhenTicketEnds: boolean;
    rowVersion: string | null;
    capabilities: SharedRecordSchemas['RequestCapabilities'];
    grantedEncounterId: string | null;
    ownerDetails: SharedRecordSchemas['RequestOwnerDetails'];
  };
  HiddenAccessResponseRecordPage: {
    items: ReadonlyArray<SharedRecordSchemas['HiddenAccessResponse']> | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
  HiddenCapabilities: { canRequestAccess: boolean };
  HiddenRequestState: { status: string | null; requestId: string | null };
  HiddenTimelineEntry: {
    type: string | null;
    entryId: string | null;
    visitDate: string;
    isHidden: boolean;
    hiddenEncounterToken: string | null;
    accessRequest: SharedRecordSchemas['HiddenRequestState'];
    capabilities: SharedRecordSchemas['HiddenCapabilities'];
  };
  MedicalRecordMode: 'OwnPatient' | 'TreatingDoctor' | 'Dependent';
  MedicalRecordPatient: {
    patientId: string;
    nameAr: string | null;
    nameEn: string | null;
    dateOfBirth: string;
    gender: SharedRecordSchemas['Gender'];
  };
  MedicationDurationType: 'Fixed' | 'Ongoing';
  MedicationDurationUnit: 'Days' | 'Weeks' | 'Months';
  MedicationFrequency:
    | 'OnceDaily'
    | 'TwiceDaily'
    | 'ThreeTimesDaily'
    | 'FourTimesDaily'
    | 'Every4Hours'
    | 'Every6Hours'
    | 'Every8Hours'
    | 'Every12Hours'
    | 'Morning'
    | 'Bedtime'
    | 'OnceOnly'
    | 'Custom';
  MedicationQuantityUnit:
    | 'Tablet'
    | 'Capsule'
    | 'Bottle'
    | 'Ampoule'
    | 'Vial'
    | 'Tube'
    | 'Inhaler'
    | 'Patch'
    | 'Suppository'
    | 'Other';
  PatientPrescriptionItemResponse: {
    sortOrder: number;
    medicationName: string | null;
    scientificName: string | null;
    clinical: SharedRecordSchemas['PrescriptionItemData'];
  };
  PrescriptionItemData: {
    strength: string | null;
    dosageForm: string | null;
    route: string | null;
    dose: string | null;
    frequencyCode: SharedRecordSchemas['MedicationFrequency'];
    frequencyText: string | null;
    durationType: SharedRecordSchemas['MedicationDurationType'];
    durationValue: number | null;
    durationUnit: SharedRecordSchemas['MedicationDurationUnit'];
    asNeeded: boolean;
    prnReason: string | null;
    minimumIntervalText: string | null;
    maxPer24HoursText: string | null;
    quantityValue: number | null;
    quantityUnit: SharedRecordSchemas['MedicationQuantityUnit'];
    instructions: string | null;
  };
  RecordAttachment: {
    attachmentId: string;
    fileName: string | null;
    contentType: string | null;
    sizeBytes: number;
    canDownload: boolean;
  };
  RecordCapabilities: {
    canView: boolean;
    canViewAttachments: boolean;
    canRequestHiddenAccess: boolean;
  };
  RecordContext: {
    mode: SharedRecordSchemas['MedicalRecordMode'];
    ticketId: string | null;
    treatingEncounterId: string | null;
    treatmentStatus: string | null;
  };
  RecordSummary: {
    completedVisitCount: number;
    currentPrescriptionCount: number;
    officialLabResultCount: number;
    officialRadiologyResultCount: number;
    hiddenEncounterCount: number;
  };
  RequestCapabilities: {
    canApprove: boolean;
    canReject: boolean;
    canRevoke: boolean;
    canOpenGrantedRecord: boolean;
  };
  RequestHistoryResponse: {
    historyId: string;
    action: string | null;
    actorApplicationUserId: string;
    occurredAtUtc: string;
  };
  RequestOwnerDetails: {
    patient: SharedRecordSchemas['ClinicalPartyResponse'];
    encounterId: string;
    requestingDoctor: SharedRecordSchemas['ClinicalPartyResponse'];
    requestingPracticeId: string;
  };
  SafeDiagnosis: { diagnosisId: string; type: string | null; displayText: string | null };
  SafeOrderContent: {
    requestedAtUtc: string;
    patientInstructions: string | null;
    items: ReadonlyArray<SharedRecordSchemas['SafeOrderItem']> | null;
    resultStatus: string | null;
  };
  SafeOrderItem: {
    itemId: string;
    nameAr: string | null;
    nameEn: string | null;
    code: string | null;
    instructions: string | null;
    status: string | null;
  };
  SafePrescriptionContent: {
    items: ReadonlyArray<SharedRecordSchemas['PatientPrescriptionItemResponse']> | null;
  };
  SafeResultContent: {
    requestId: string;
    reviewedAtUtc: string;
    externalProviderName: string | null;
    externalReportDate: string | null;
    coveredItemIds: ReadonlyArray<string> | null;
  };
  TimelineCapabilities: { canViewDetails: boolean; canViewAttachments: boolean };
  TimelineEntry:
    SharedRecordSchemas['ClinicalTimelineEntry'] | SharedRecordSchemas['HiddenTimelineEntry'];
  TimelineEntryRecordPage: {
    items: ReadonlyArray<SharedRecordSchemas['TimelineEntry']> | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
  VisibilityCapabilities: { canChangeVisibility: boolean };
  VisibilityHistoryResponse: {
    historyId: string;
    oldVisibility: SharedRecordSchemas['EncounterVisibility'];
    newVisibility: SharedRecordSchemas['EncounterVisibility'];
    revision: number;
    actorApplicationUserId: string | null;
    occurredAtUtc: string;
    source: string | null;
  };
  VisibilityHistoryResponseRecordPage: {
    items: ReadonlyArray<SharedRecordSchemas['VisibilityHistoryResponse']> | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
}
