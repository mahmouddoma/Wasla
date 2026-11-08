import { FamilyWorkspace, FamilyWorkspaceChild } from '../app/domains/families';
import { HistoricalDocument } from '../app/domains/medical-records/historical-documents.models';

export function workspaceFixture(overrides: Partial<FamilyWorkspace> = {}): FamilyWorkspace {
  return {
    hasFamily: false,
    family: null,
    dependents: [],
    pendingRequests: [],
    pendingWorkflows: [],
    canStartExistingChildLink: true,
    canStartChildOnboarding: true,
    canJoinExistingFamily: true,
    ...overrides,
  };
}
export function childFixture(overrides: Partial<FamilyWorkspaceChild> = {}): FamilyWorkspaceChild {
  return {
    patientId: 'child',
    nameAr: 'طفل تجريبي',
    canBook: false,
    canViewReservations: false,
    canCancelReservation: false,
    canRescheduleReservation: false,
    canViewQueue: false,
    canViewTicket: false,
    canViewMedicalRecord: false,
    canViewProfile: false,
    canManageContacts: false,
    canManagePhoto: false,
    canUploadHistoricalDocument: false,
    canViewHistoricalDocuments: false,
    canViewReceipts: false,
    canViewTransactions: false,
    canRequestVerification: false,
    canCorrectIdentity: false,
    canRequestIdentityCorrection: false,
    canSubmitDoctorOrderedDiagnostic: false,
    canSubmitLabResult: false,
    canSubmitRadiologyResult: false,
    canViewDiagnosticSubmissions: false,
    canWithdrawDiagnosticSubmission: false,
    canViewLabSubmissions: false,
    canViewRadiologySubmissions: false,
    canWithdrawLabSubmission: false,
    canWithdrawRadiologySubmission: false,
    operationalReasonCode: null,
    medicalReasonCode: null,
    capabilityReasons: {},
    ...overrides,
  };
}
export function documentFixture(overrides: Partial<HistoricalDocument> = {}): HistoricalDocument {
  return {
    documentId: 'doc',
    subjectPatientId: 'patient',
    state: 'AvailableUnverified',
    currentVersionNumber: 1,
    uploadedAtUtc: '2026-11-08T10:00:00Z',
    rowVersion: 'AAAA',
    currentVersion: {
      versionNumber: 1,
      createdAtUtc: '2026-11-08T10:00:00Z',
      metadata: {
        category: 'HistoricalLabReport',
        dateUnknown: true,
        documentDate: null,
        providerName: null,
        title: 'Test report',
        patientNote: null,
      },
      attachments: [
        {
          attachmentId: 'file',
          fileName: 'report.pdf',
          contentType: 'application/pdf',
          length: 20,
        },
      ],
    },
    canRevise: true,
    canWithdraw: true,
    source: 'PatientProvided',
    verificationStatus: 'Unverified',
    ...overrides,
  };
}
