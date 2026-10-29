export type Gender = 'Male' | 'Female';

export interface DoctorPatientCapabilities {
  readonly canViewAttendances: boolean;
  readonly canViewEncounters: boolean;
  readonly canViewDiagnoses: boolean;
  readonly canViewPrescriptions: boolean;
  readonly canExportPrescriptions: boolean;
  readonly canViewAppointments: boolean;
  readonly canViewFollowUps: boolean;
  readonly canViewLabRequests: boolean;
  readonly canViewLabResults: boolean;
  readonly canViewLabSubmissions: boolean;
  readonly canViewRadiologyRequests: boolean;
  readonly canViewRadiologyResults: boolean;
  readonly canViewRadiologySubmissions: boolean;
}

export interface DoctorPatientPractice {
  readonly id: string;
  readonly nameAr: string | null;
  readonly nameEn: string | null;
  readonly isActive: boolean;
}

export interface DoctorPatientListItem {
  readonly patientId: string;
  readonly nameAr: string | null;
  readonly nameEn: string | null;
  readonly phoneNumber: string | null;
  readonly email: string | null;
  readonly dateOfBirth: string;
  readonly age: number;
  readonly gender: Gender;
  readonly firstAttendanceAtUtc: string;
  readonly lastAttendanceAtUtc: string;
  readonly lastAttendanceBusinessDate: string;
  readonly attendanceCount: number;
  readonly completedEncounterCount: number | null;
  readonly practiceCount: number;
  readonly lastPractice: DoctorPatientPractice;
  readonly hasUpcomingAppointment: boolean | null;
  readonly historicalOnly: boolean;
  readonly capabilities: DoctorPatientCapabilities;
}

export interface DoctorPatientsSummary {
  readonly allTimeUniquePatients: number;
  readonly attendedLast30Days: number;
  readonly returningPatients: number;
}

export interface DoctorPatientsPageResponse {
  readonly items: readonly DoctorPatientListItem[];
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly summary: DoctorPatientsSummary;
  readonly asOfUtc: string;
}

export interface DoctorPatientAttendance {
  readonly ticketId: string;
  readonly practiceId: string;
  readonly practiceName: string | null;
  readonly businessDate: string;
  readonly checkInAtUtc: string;
  readonly source: string | null;
  readonly checkInMode: string | null;
  readonly ticketStatus: string | null;
  readonly ticketNumber: number;
  readonly isArchived: boolean;
  readonly linkedReservationId: string | null;
  readonly encounterId: string | null;
  readonly encounterStatus: string | null;
  readonly canViewTicket: boolean;
  readonly canViewEncounter: boolean;
}

export interface DoctorPatientDiagnosis {
  readonly diagnosisId: string;
  readonly encounterId: string;
  readonly practiceId: string;
  readonly businessDate: string;
  readonly encounterDate: string;
  readonly diagnosisType: string | null;
  readonly displayText: string | null;
  readonly encounterStatus: string | null;
  readonly isActive: boolean;
  readonly isHistoricalPractice: boolean;
}

export interface DoctorPatientPrescription {
  readonly prescriptionId: string;
  readonly encounterId: string;
  readonly practiceId: string;
  readonly visitDateUtc: string;
  readonly currentVersionNumber: number;
  readonly currentStatus: string | null;
  readonly medicationCount: number;
  readonly hasVersions: boolean;
  readonly canView: boolean;
  readonly canExport: boolean;
  readonly isHistoricalPractice: boolean;
}

export interface DoctorPatientAppointment {
  readonly reservationId: string;
  readonly practiceId: string;
  readonly businessDate: string;
  readonly scheduledStart: string;
  readonly visitType: string | null;
  readonly segment: string | null;
  readonly status: string | null;
  readonly linkedTicketId: string | null;
  readonly followUpEligibilityId: string | null;
  readonly isArchived: boolean;
  readonly source: string | null;
}

export interface DoctorPatientFollowUp {
  readonly eligibilityId: string;
  readonly sourceEncounterId: string;
  readonly practiceId: string;
  readonly status: string | null;
  readonly validUntil: string;
  readonly reservedReservationId: string | null;
  readonly reservedTicketId: string | null;
  readonly consumedEncounterId: string | null;
  readonly canBook: boolean;
  readonly canCreateFollowUpFromSource: boolean;
  readonly isHistoricalPractice: boolean;
}

export interface DoctorMyPatientOverviewResponse {
  readonly patient: DoctorPatientListItem;
  readonly practices: readonly DoctorPatientPractice[] | null;
  readonly lastAttendance: DoctorPatientAttendance | null;
  readonly lastDiagnosis: DoctorPatientDiagnosis | null;
  readonly lastPrescription: DoctorPatientPrescription | null;
  readonly labRequestCount: number | null;
  readonly radiologyRequestCount: number | null;
  readonly nextAppointment: DoctorPatientAppointment | null;
  readonly currentFollowUp: DoctorPatientFollowUp | null;
}

export interface ClinicalPage<T> {
  readonly items: readonly T[];
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}

export interface DoctorPatientQuery {
  readonly search?: string;
  readonly practiceId?: string;
  readonly lastAttendanceFrom?: string;
  readonly lastAttendanceTo?: string;
  readonly minAttendanceCount?: number;
  readonly hasUpcomingAppointment?: boolean;
  readonly practiceScope?: 'all' | 'active' | 'historicalOnly';
  readonly pageNumber: number;
  readonly pageSize: number;
  readonly asOfUtc?: string;
}

export interface ClinicalFilterQuery {
  readonly practiceId?: string;
  readonly fromDate?: string;
  readonly toDate?: string;
  readonly status?: string;
  readonly pageNumber: number;
  readonly pageSize: number;
}

