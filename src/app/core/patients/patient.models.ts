import { Gender } from '../auth/auth.models';

export type PatientRelationshipType = 'Father' | 'Mother' | 'Guardian' | 'LegalGuardian' | 'Other';

export interface CreatePatientRequest {
  nameAr: string;
  nameEn: string;
  dateOfBirth: string;
  gender: Gender;
  phoneNumber: string;
  email: string;
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
