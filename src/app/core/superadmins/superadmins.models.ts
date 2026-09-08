export interface SuperAdminsQuery {
  searchText?: string;
  pageNumber: number;
  pageSize: number;
  includeDeleted: boolean;
}

export interface SuperAdminRecord {
  superAdminId: string;
  applicationUserId: string;
  userName: string;
  email: string;
  phoneNumber: string | null;
  nameAr: string;
  nameEn: string | null;
  isRootSuperAdmin: boolean;
  isActive: boolean;
  isDeleted: boolean;
  createdOnUtc: string;
}

export interface SuperAdminsPage {
  items: SuperAdminRecord[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface CreateSuperAdminRequest {
  userName: string;
  email: string;
  phoneNumber?: string;
  nameAr: string;
  nameEn?: string;
  initialPassword: string;
  confirmPassword: string;
}

export interface UpdateSuperAdminRequest {
  nameAr: string;
  nameEn?: string;
  email: string;
  phoneNumber?: string;
}
