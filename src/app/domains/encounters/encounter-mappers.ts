import {
  EncounterAmendment,
  EncounterPage,
  EncounterSummary,
  EncounterAmendmentChange,
} from './encounter.models';

export function mapAmendmentChange(change: EncounterAmendmentChange) {
  if (change.type === 'ClinicalNotes')
    return { target: 'ClinicalNotes', changeType: 'Updated', clinicalNotes: change.clinicalNotes };
  const action = { Add: 'Added', Update: 'Updated', Remove: 'Removed' } as const;
  return {
    target: 'Diagnosis',
    changeType: action[change.action],
    diagnosisId: change.diagnosisId,
    type: change.diagnosisType ?? change.diagnosis?.type,
    displayText: change.displayText ?? change.diagnosis?.displayText,
    notes: change.notes ?? change.diagnosis?.notes,
  };
}

/** The list endpoint uses flat identities; detail endpoints return nested identities. */
export interface EncounterSummaryResponse extends Omit<
  EncounterSummary,
  'patient' | 'doctor' | 'practice'
> {
  readonly patientId: string;
  readonly patientNameAr: string;
  readonly patientNameEn: string | null;
  readonly doctorPracticeId: string;
  readonly practiceNameAr: string;
  readonly practiceNameEn: string | null;
  readonly visitTypeCode: string;
  readonly visitTypeNameAr: string;
  readonly visitTypeNameEn: string | null;
}

export function mapEncounterPage(
  page: Omit<EncounterPage, 'items'> & {
    items: readonly (EncounterSummaryResponse | EncounterSummary)[];
  },
): EncounterPage {
  return {
    ...page,
    items: (page.items ?? []).map((item) => {
      if ('patient' in item) return item;
      return {
        ...item,
        patient: { id: item.patientId, nameAr: item.patientNameAr, nameEn: item.patientNameEn },
        practice: {
          id: item.doctorPracticeId,
          nameAr: item.practiceNameAr,
          nameEn: item.practiceNameEn,
        },
        visitType: {
          id: item.visitTypeCode,
          nameAr: item.visitTypeNameAr,
          nameEn: item.visitTypeNameEn,
        },
      };
    }),
  };
}

export interface EncounterAmendmentResponse {
  readonly sequenceNumber: number;
  readonly reason: string;
  readonly createdAtUtc: string;
  readonly changes: readonly {
    readonly target: string;
    readonly changeType: string;
    readonly beforeSnapshot: string | null;
    readonly afterSnapshot: string | null;
  }[];
}

export function mapEncounterAmendment(
  item: EncounterAmendmentResponse | EncounterAmendment,
): EncounterAmendment {
  if ('sequence' in item) return item;
  return {
    sequence: item.sequenceNumber,
    reason: item.reason,
    author: '',
    createdOnUtc: item.createdAtUtc,
    changes: item.changes.map((change) => ({
      type: change.target,
      before: change.beforeSnapshot,
      after: change.afterSnapshot,
    })),
  };
}
