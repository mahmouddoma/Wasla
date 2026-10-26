import { Gender } from '../../core/auth/auth.models';

export type PatientRelationshipType = 'Father' | 'Mother' | 'Guardian' | 'LegalGuardian' | 'Other';

export interface CreatePatientRequest {
  nameAr: string;
  nameEn: string;
  dateOfBirth: string;
  gender: Gender;
  phoneNumber: string;
  email: string;
  doctorPracticeId?: string;
  profileImage?: File;
  primaryContactNameAr: string;
  primaryContactPhoneNumber: string;
  primaryContactRelationshipType: PatientRelationshipType;
  primaryContactIsPrimary: boolean;
  primaryContactLinkedPatientId: string;
}

export interface CreatePatientResponse {
  patientId: string;
}

export interface PatientSearchQuery {
  doctorPracticeId?: string;
  phoneNumber?: string;
  name?: string;
  dateOfBirth?: string;
  pageNumber: number;
  pageSize: number;
}

export interface PagedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages?: number;
}

export interface PatientSearchItem {
  patientId: string;
  nameAr: string;
  nameEn: string | null;
  dateOfBirth: string;
  gender: Gender;
  phoneNumber: string | null;
  hasContactPhone: boolean;
}

export interface PatientProfile {
  patientId: string;
  nameAr: string;
  nameEn: string | null;
  dateOfBirth: string;
  gender: Gender;
  phoneNumber: string | null;
  email: string | null;
  hasProfileImage: boolean;
  rowVersion: string;
}

export interface UpdatePatientProfileRequest {
  nameAr: string;
  nameEn: string;
  phoneNumber: string;
  email: string;
  rowVersion: string;
  profileImage?: File;
}

export interface PatientContact {
  contactId: string;
  nameAr: string;
  nameEn: string | null;
  phoneNumber: string;
  relationshipType: PatientRelationshipType;
  linkedPatientId: string | null;
  isPrimary: boolean;
}

export interface UpsertPatientContactRequest {
  nameAr: string;
  nameEn: string | null;
  phoneNumber: string;
  relationshipType: PatientRelationshipType;
  linkedPatientId: string | null;
  isPrimary: boolean;
}

export interface RegisterFullPatientRequest {
  readonly doctorPracticeId: string;
  readonly nameAr: string;
  readonly dateOfBirth: string;
  readonly gender: Gender;
  readonly phoneNumber: string;
  readonly email: string;
  readonly verifiedInPerson: boolean;
  readonly identityVerificationBasis: string;
  readonly nameEn?: string;
  readonly verificationNote?: string;
  readonly matchReviewOutcome?: string;
  readonly matchReviewReason?: string;
  readonly profileImage?: File;
  readonly personalIdFrontImage?: File;
  readonly personalIdBackImage?: File;
}

export interface RegisterFullPatientResponse {
  readonly patientId: string;
  readonly applicationUserId: string;
  readonly profileType: string;
  readonly accountStatus: string;
  readonly activationEmailMasked: string;
  readonly invitationExpiresOnUtc: string;
}

export interface RegistrationMatchesRequest {
  readonly mode: 'Search' | 'ConfirmReuse' | 'ConfirmClaimIdentity';
  readonly doctorPracticeId: string;
  readonly email?: string;
  readonly phoneNumber?: string;
  readonly nameAr?: string;
  readonly dateOfBirth?: string;
  readonly gender?: Gender;
  readonly pageSize?: number;
  readonly patientId?: string;
  readonly verifiedInPerson?: boolean;
  readonly verificationBasis?: string;
  readonly reason?: string;
  readonly claimantEmail?: string;
}

export interface RegistrationMatchesResponse {
  readonly matches?: readonly PatientSearchItem[];
  readonly patientId?: string;
  readonly attestationId?: string;
  readonly status?: string;
}

