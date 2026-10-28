import { PaymentMethod } from '../finance';

export type TicketActor = 'Doctor' | 'Reception' | 'Patient';
export type TicketStatus =
  'Waiting' | 'Called' | 'InProgress' | 'NoShow' | 'Completed' | 'Cancelled';

export interface TicketIdentity {
  readonly id?: string;
  readonly nameAr: string;
  readonly nameEn: string | null;
}

export interface TicketCallAttempt {
  readonly callCycle?: number;
  readonly attemptNumber: number;
  readonly calledOnUtc: string;
  readonly outcome?: string | null;
  readonly confirmedOnUtc?: string | null;
  readonly outcomeRecordedOnUtc?: string | null;
}

export interface TicketTimelineItem {
  readonly eventId: string;
  readonly eventType?: string | null;
  readonly occurredAtUtc: string;
  readonly reasonCode?: string | null;
}

export interface TicketOperationalCapabilities {
  readonly canCancel: boolean;
  readonly canRestore: boolean;
  readonly canQueueMutate: boolean;
  readonly canMutateOperationalRecord: boolean;
  readonly canCheckIn?: boolean;
}

/** Operational projection only; clinical records and other-patient data are deliberately absent. */
export interface PracticeTicket {
  readonly ticketId: string;
  readonly ticketNumber: string;
  readonly status: TicketStatus;
  readonly source: string;
  readonly practice: TicketIdentity;
  readonly doctor: TicketIdentity;
  readonly patient?: TicketIdentity;
  readonly doctorPracticeId?: string;
  readonly doctorId?: string;
  readonly patientId?: string;
  readonly reservationId?: string | null;
  readonly medicalEncounterId?: string | null;
  readonly medicalEncounterRowVersion?: string | null;
  readonly followUpEligibilityId?: string | null;
  readonly prescriptionId?: string | null;
  readonly businessDate: string;
  readonly segmentId?: string | null;
  readonly segmentPriority?: number;
  readonly segment?: TicketIdentity | null;
  readonly visitTypeId?: string | null;
  readonly visitTypeCode?: string | null;
  readonly visitType?: TicketIdentity | null;
  readonly priceSnapshot?: number;
  readonly currency?: string | null;
  readonly currencyCode?: string | null;
  readonly canRefund?: boolean;
  readonly isRefunded?: boolean;
  readonly refundableAmount?: number;
  readonly paymentId?: string | null;
  readonly paymentTransactionNumber?: string | null;
  readonly refundId?: string | null;
  readonly refundTransactionNumber?: string | null;
  readonly checkedInOnUtc?: string | null;
  readonly checkInTimeUtc?: string | null;
  readonly queueOrderTime?: string | null;
  readonly queueOrderTimeUtc?: string | null;
  readonly calledOnUtc?: string | null;
  readonly startedOnUtc?: string | null;
  readonly completedOnUtc?: string | null;
  readonly lastUpdatedOnUtc: string;
  readonly patientsAheadNow: number;
  readonly fastTrack: boolean;
  readonly isFastTrack?: boolean;
  readonly callAttempts: readonly TicketCallAttempt[];
  readonly timeline?: readonly TicketTimelineItem[];
  readonly operationalCapabilities?: TicketOperationalCapabilities | null;
  readonly rowVersion: string;
  readonly isArchived?: boolean;
  readonly archivedAtUtc?: string | null;
  readonly patientsAheadNowIsCurrent?: boolean;
  readonly timelineHasMore?: boolean;
}

const TICKET_STATUS_BY_INDEX: readonly TicketStatus[] = [
  'Waiting',
  'Called',
  'InProgress',
  'NoShow',
  'Completed',
  'Cancelled',
];

function normalizeStatus(value: unknown): TicketStatus {
  if (typeof value === 'number' && TICKET_STATUS_BY_INDEX[value]) {
    return TICKET_STATUS_BY_INDEX[value];
  }
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    const matched = TICKET_STATUS_BY_INDEX.find(
      (s) => s.toLowerCase() === trimmed.toLowerCase(),
    );
    return matched ?? (trimmed as TicketStatus);
  }
  return 'Waiting';
}

function normalizeSource(value: unknown, reservationId?: unknown): string {
  if (value === 0 || (typeof value === 'string' && value.trim().toLowerCase() === 'reservation')) {
    return 'Reservation';
  }
  if (value === 1 || (typeof value === 'string' && value.trim().toLowerCase() === 'walkin')) {
    return 'WalkIn';
  }
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (reservationId !== undefined) {
    return reservationId ? 'Reservation' : 'WalkIn';
  }
  return '';
}

export function normalizeTicket(raw: unknown): PracticeTicket {
  if (!raw || typeof raw !== 'object' || Object.keys(raw as object).length === 0) {
    return raw as PracticeTicket;
  }
  const envelope = raw as Record<string, unknown>;
  const r =
    !envelope['ticketId'] &&
    !envelope['ticketNumber'] &&
    !envelope['medicalEncounterId'] &&
    typeof (envelope['data'] ?? envelope['ticket'] ?? envelope['item']) === 'object' &&
    (envelope['data'] ?? envelope['ticket'] ?? envelope['item']) !== null
      ? ((envelope['data'] ?? envelope['ticket'] ?? envelope['item']) as Record<string, unknown>)
      : envelope;

  const practiceRaw = r['practice'] as Record<string, unknown> | undefined;
  const practice: TicketIdentity =
    practiceRaw && (practiceRaw['nameAr'] || practiceRaw['nameEn'] || practiceRaw['id'])
      ? {
          id:
            (practiceRaw['id'] as string) ||
            (r['doctorPracticeId'] as string) ||
            (r['practiceId'] as string) ||
            undefined,
          nameAr: (practiceRaw['nameAr'] as string) || (practiceRaw['nameEn'] as string) || '',
          nameEn: (practiceRaw['nameEn'] as string) ?? null,
        }
      : {
          id: (r['doctorPracticeId'] as string) || (r['practiceId'] as string) || undefined,
          nameAr: (r['practiceNameAr'] as string) || (r['practiceNameEn'] as string) || '',
          nameEn: (r['practiceNameEn'] as string) ?? null,
        };

  const doctorRaw = r['doctor'] as Record<string, unknown> | undefined;
  const doctor: TicketIdentity =
    doctorRaw && (doctorRaw['nameAr'] || doctorRaw['nameEn'] || doctorRaw['id'])
      ? {
          id: (doctorRaw['id'] as string) || (r['doctorId'] as string) || undefined,
          nameAr: (doctorRaw['nameAr'] as string) || (doctorRaw['nameEn'] as string) || '',
          nameEn: (doctorRaw['nameEn'] as string) ?? null,
        }
      : {
          id: (r['doctorId'] as string) || undefined,
          nameAr: (r['doctorNameAr'] as string) || (r['doctorNameEn'] as string) || '',
          nameEn: (r['doctorNameEn'] as string) ?? null,
        };

  const patientRaw = r['patient'] as Record<string, unknown> | undefined;
  const flatPatientAr =
    (r['patientNameAr'] as string) ||
    (r['patientFullNameAr'] as string) ||
    (r['fullNameAr'] as string) ||
    (r['patientName'] as string) ||
    '';
  const flatPatientEn =
    (r['patientNameEn'] as string) ||
    (r['patientFullNameEn'] as string) ||
    (r['fullNameEn'] as string) ||
    null;
  const patient: TicketIdentity | undefined =
    patientRaw &&
    (patientRaw['nameAr'] ||
      patientRaw['nameEn'] ||
      patientRaw['fullNameAr'] ||
      patientRaw['fullNameEn'] ||
      patientRaw['name'])
      ? {
          id: (patientRaw['id'] as string) || (r['patientId'] as string) || undefined,
          nameAr:
            (patientRaw['nameAr'] as string) ||
            (patientRaw['fullNameAr'] as string) ||
            (patientRaw['name'] as string) ||
            (patientRaw['nameEn'] as string) ||
            (patientRaw['fullNameEn'] as string) ||
            '',
          nameEn:
            (patientRaw['nameEn'] as string) ||
            (patientRaw['fullNameEn'] as string) ||
            null,
        }
      : flatPatientAr || flatPatientEn
        ? {
            id: (r['patientId'] as string) || undefined,
            nameAr: flatPatientAr || flatPatientEn || '',
            nameEn: flatPatientEn,
          }
        : undefined;

  const segRaw = r['segment'] as Record<string, unknown> | undefined;
  const segment: TicketIdentity | null | undefined =
    segRaw && (segRaw['nameAr'] || segRaw['nameEn'] || segRaw['id'])
      ? {
          id: (segRaw['id'] as string) || (r['segmentId'] as string) || undefined,
          nameAr: (segRaw['nameAr'] as string) || (segRaw['nameEn'] as string) || '',
          nameEn: (segRaw['nameEn'] as string) ?? null,
        }
      : r['segmentNameAr'] || r['segmentNameEn']
        ? {
            id: (r['segmentId'] as string) || undefined,
            nameAr: (r['segmentNameAr'] as string) || (r['segmentNameEn'] as string) || '',
            nameEn: (r['segmentNameEn'] as string) ?? null,
          }
        : (r['segment'] as null | undefined);

  const vtRaw = r['visitType'] as Record<string, unknown> | undefined;
  const visitType: TicketIdentity | null | undefined =
    vtRaw && (vtRaw['nameAr'] || vtRaw['nameEn'] || vtRaw['id'])
      ? {
          id: (vtRaw['id'] as string) || (r['visitTypeId'] as string) || undefined,
          nameAr: (vtRaw['nameAr'] as string) || (vtRaw['nameEn'] as string) || '',
          nameEn: (vtRaw['nameEn'] as string) ?? null,
        }
      : r['visitTypeNameAr'] || r['visitTypeNameEn']
        ? {
            id: (r['visitTypeId'] as string) || undefined,
            nameAr: (r['visitTypeNameAr'] as string) || (r['visitTypeNameEn'] as string) || '',
            nameEn: (r['visitTypeNameEn'] as string) ?? null,
          }
        : (r['visitType'] as null | undefined);

  const rawAttempts = Array.isArray(r['callAttempts'])
    ? (r['callAttempts'] as Record<string, unknown>[])
    : [];
  const callAttempts: readonly TicketCallAttempt[] = rawAttempts.map((a, idx) => ({
    callCycle: typeof a['callCycle'] === 'number' ? a['callCycle'] : undefined,
    attemptNumber: typeof a['attemptNumber'] === 'number' ? a['attemptNumber'] : idx + 1,
    calledOnUtc: (a['calledOnUtc'] as string) || '',
    outcome: (a['outcome'] as string | null | undefined) ?? null,
    confirmedOnUtc:
      (a['confirmedOnUtc'] as string | null | undefined) ??
      (a['outcomeRecordedOnUtc'] as string | null | undefined) ??
      null,
    outcomeRecordedOnUtc:
      (a['outcomeRecordedOnUtc'] as string | null | undefined) ??
      (a['confirmedOnUtc'] as string | null | undefined) ??
      null,
  }));

  const checkedInOnUtc =
    (r['checkedInOnUtc'] as string | null | undefined) ??
    (r['checkInTimeUtc'] as string | null | undefined) ??
    null;
  const queueOrderTime =
    (r['queueOrderTime'] as string | null | undefined) ??
    (r['queueOrderTimeUtc'] as string | null | undefined) ??
    null;
  const currencyCode =
    (r['currencyCode'] as string | null | undefined) ??
    (r['currency'] as string | null | undefined) ??
    null;
  const fastTrack = Boolean(r['fastTrack'] ?? r['isFastTrack']);

  return {
    ...(r as unknown as PracticeTicket),
    ticketId: (r['ticketId'] as string) || (r['id'] as string) || '',
    ticketNumber:
      r['ticketNumber'] !== undefined && r['ticketNumber'] !== null
        ? String(r['ticketNumber'])
        : '',
    status: normalizeStatus(r['status']),
    source: normalizeSource(r['source'], r['reservationId']),
    practice,
    doctor,
    ...(patient ? { patient } : {}),
    ...(segment !== undefined ? { segment } : {}),
    ...(visitType !== undefined ? { visitType } : {}),
    checkedInOnUtc,
    checkInTimeUtc: checkedInOnUtc,
    queueOrderTime,
    queueOrderTimeUtc: queueOrderTime,
    currency: currencyCode,
    currencyCode,
    fastTrack,
    isFastTrack: fastTrack,
    callAttempts,
    timeline: Array.isArray(r['timeline'])
      ? (r['timeline'] as TicketTimelineItem[])
      : undefined,
  };
}

export function normalizeQueue(raw: unknown): PracticeQueue {
  if (!raw || typeof raw !== 'object' || Object.keys(raw as object).length === 0) {
    return raw as PracticeQueue;
  }
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as PracticeQueue),
    inProgress: r['inProgress'] ? normalizeTicket(r['inProgress']) : null,
    called: r['called'] ? normalizeTicket(r['called']) : null,
    waiting: Array.isArray(r['waiting'])
      ? r['waiting'].map((item, idx) => {
          const normalized = normalizeTicket(item);
          return typeof normalized.patientsAheadNow === 'number'
            ? normalized
            : { ...normalized, patientsAheadNow: idx };
        })
      : [],
    noShow: Array.isArray(r['noShow']) ? r['noShow'].map(normalizeTicket) : [],
  };
}

export interface PracticeQueue {
  readonly inProgress: PracticeTicket | null;
  readonly called: PracticeTicket | null;
  readonly waiting: readonly PracticeTicket[];
  readonly noShow: readonly PracticeTicket[];
}

export interface CheckInTicketRequest {
  readonly paidAmount: number;
  readonly paymentMethod: PaymentMethod;
  readonly referenceNumber: string | null;
  readonly notes: string | null;
}

export interface ForceCheckInTicketRequest extends CheckInTicketRequest {
  readonly reason: string;
}

export interface CheckInSubmission extends CheckInTicketRequest {
  readonly force: boolean;
  readonly reason: string;
}

export interface CreateWalkInTicketRequest {
  readonly followUpEligibilityId?: string;
  readonly followUpEligibilityRowVersion?: string;
  readonly patientId: string;
  readonly segmentId: string;
  readonly visitTypeId: string;
  readonly paidAmount: number;
  readonly paymentMethod: PaymentMethod;
  readonly referenceNumber: string | null;
  readonly notes: string | null;
}

export interface TicketVersionRequest {
  readonly rowVersion: string;
}

export interface CompleteTicketRequest {
  readonly ticketRowVersion: string;
  readonly encounterRowVersion: string;
  readonly prescriptionRowVersion?: string | null;
  readonly labRequestRowVersion?: string | null;
  readonly radiologyRequestRowVersion?: string | null;
}

export interface TicketReasonRequest extends TicketVersionRequest {
  readonly reason: string;
}

/** Server-owned valid Walk-In combinations; independent of reservation availability. */
export interface WalkInVisitTypeOption {
  readonly visitTypeId: string;
  readonly code: 'NewConsultation' | 'FollowUp';
  readonly nameAr: string;
  readonly nameEn: string | null;
  readonly price: number;
}

export interface WalkInSegmentOption {
  readonly segmentId: string;
  readonly nameAr: string;
  readonly nameEn: string | null;
  readonly priority: number;
  readonly visitTypes: readonly WalkInVisitTypeOption[];
}

export interface WalkInOptions {
  readonly practiceId: string;
  readonly currencyCode: 'EGP';
  readonly segments: readonly WalkInSegmentOption[];
}
