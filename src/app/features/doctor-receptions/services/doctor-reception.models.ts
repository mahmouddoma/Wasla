export interface ReceptionAssignmentPermission {
  id: string;
  code: string;
  nameAr?: string;
  nameEn?: string | null;
  group?: string;
}

export interface DoctorReceptionAssignment {
  id: string;
  doctorPracticeId: string;
  practiceNameAr?: string | null;
  practiceNameEn?: string | null;
  isActive: boolean;
  permissions: ReceptionAssignmentPermission[];
  rowVersion: string;
}

export interface DoctorReception {
  id: string;
  applicationUserId: string;
  userName: string;
  email: string;
  phoneNumber: string | null;
  nameAr: string;
  nameEn: string | null;
  assignments: DoctorReceptionAssignment[];
  rowVersion: string;
}

export interface CreateDoctorReceptionRequest {
  userName: string;
  email: string;
  phoneNumber: string | null;
  temporaryPassword: string | null;
  nameAr: string;
  nameEn: string | null;
}

export interface CreateReceptionAssignmentRequest {
  doctorPracticeId: string;
  permissionIds: string[];
}

export interface UpdateReceptionAssignmentRequest {
  permissionIds: string[];
  rowVersion: string;
}
