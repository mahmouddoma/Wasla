export interface DrugCatalogManager {
  readonly id: string;
  readonly userName: string;
  readonly email: string;
  readonly phoneNumber: string | null;
  readonly isActive: boolean;
  readonly isFirstLogin: boolean;
}
export interface ManagerPage {
  readonly items: readonly DrugCatalogManager[];
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}
export interface ManagerContact {
  email: string;
  phoneNumber: string | null;
}
export interface CreateManagerRequest extends ManagerContact {
  userName: string;
  initialPassword: string;
  confirmPassword: string;
}
