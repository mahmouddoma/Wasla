export interface ReceptionPractice {
  id: string;
  nameAr: string;
  nameEn: string | null;
  doctorNameAr: string | null;
  doctorNameEn: string | null;
  isActive: boolean;
  permissionCodes: string[];
}

export interface ReceptionPracticeResponse {
  id?: string;
  practiceId?: string;
  doctorPracticeId?: string;
  nameAr?: string;
  practiceNameAr?: string;
  nameEn?: string | null;
  practiceNameEn?: string | null;
  doctorNameAr?: string | null;
  doctorNameEn?: string | null;
  isActive?: boolean;
  permissionCodes?: string[];
}

export type ReceptionPracticesResponse =
  ReceptionPracticeResponse[] | { items: ReceptionPracticeResponse[] };
