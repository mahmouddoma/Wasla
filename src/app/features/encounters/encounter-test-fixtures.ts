import { EncounterDetails } from '../../domains/encounters';
export const encounterFixture: EncounterDetails = {
  encounterId: 'e1',
  ticketId: 't1',
  status: 'InProgress',
  rowVersion: 'ev1',
  patient: { id: 'u1', nameAr: 'Synthetic patient', nameEn: 'Patient' },
  practice: { id: 'p1', nameAr: 'Synthetic clinic', nameEn: 'Clinic' },
  doctor: { id: 'd1', nameAr: 'Synthetic doctor', nameEn: 'Doctor' },
  startedAtUtc: '2026-10-05T09:00:00Z',
  completedAtUtc: null,
  clinicalNotes: 'Findings',
  diagnoses: [],
  hasDiagnosis: false,
  hasFollowUpEligibility: false,
  capabilities: {
    canEditClinicalNotes: true,
    canManageDiagnoses: true,
    canComplete: true,
    canAmend: false,
    canCreateFollowUpEligibility: false,
  },
};
