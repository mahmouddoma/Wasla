export type DrugStatus = 'Active' | 'NeedsReview' | 'Inactive' | 'Merged';
export interface DrugData {
  commercialNameEn: string;
  commercialNameAr: string | null;
  scientificName: string | null;
  manufacturer: string | null;
  drugClass: string | null;
  route: string | null;
  strengthText: string | null;
  dosageForm: string | null;
  priceEgp: number | null;
}
export interface DrugCatalogItem extends DrugData {
  readonly drugCatalogId: string;
  readonly status: DrugStatus;
  readonly rowVersion: string;
  readonly source?: string | null;
  readonly targetDrugCatalogId?: string | null;
}
export interface DrugCatalogDetails extends DrugCatalogItem {
  readonly history?: readonly {
    readonly id?: string;
    readonly action: string;
    readonly reason?: string | null;
    readonly createdOnUtc: string;
    readonly changedBy?: string | null;
  }[];
}
export interface DrugQuery {
  search?: string;
  status?: DrugStatus;
  pageNumber: number;
  pageSize: number;
}
export interface DrugPage {
  readonly items: readonly DrugCatalogItem[];
  readonly totalCount: number;
  readonly pageNumber: number;
  readonly pageSize: number;
}
export interface DrugMutation {
  readonly rowVersion: string;
  readonly reason: string;
}
