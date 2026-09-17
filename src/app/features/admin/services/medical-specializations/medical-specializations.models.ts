export interface MedicalSpecializationsQuery {
  search?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  pageNumber: number;
  pageSize: number;
}

export interface MedicalSpecialization {
  id: string;
  nameAr: string;
  nameEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  isActive: boolean;
  sortOrder: number;
  isDeleted: boolean;
  rowVersion: string;
}

export interface MedicalSpecializationsPage {
  items: MedicalSpecialization[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface CreateMedicalSpecializationRequest {
  nameAr: string;
  nameEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  sortOrder: number;
}

export interface UpdateMedicalSpecializationRequest extends CreateMedicalSpecializationRequest {
  rowVersion: string;
}

export interface MedicalSpecializationLifecycleRequest {
  rowVersion: string;
}
